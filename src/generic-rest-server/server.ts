import http, { ClientRequest, IncomingMessage, STATUS_CODES } from "http"
import * as util from "util"
import * as Log from "../simple-logger"
import * as SheetsDAL from "../google-sheets-model"
import { google, sheets_v4, GoogleApis } from "googleapis"
import { readRequestBody } from "./body-parser"
import { Router } from "./router"
import {
  HttpResponse,
  TagIncomingMessage,
  TaggedIncomingMessage,
} from "./http-objects"

Log.setLevelByString(process.env.LOG_LEVEL ?? "INFO", false)

///////////////////////
// Setup HTTP server //
///////////////////////
export async function runServer({
  maxRequestSize = parseInt(process.env.MAX_REQUEST_SIZE ?? "") || 50 * 2 ** 20, // 50 MiB
  port = parseInt(process.env.PORT ?? "") || 3141,
  google_auth_client_email = process.env.GOOGLE_AUTH_CLIENT_EMAIL,
  google_auth_private_key = process.env.GOOGLE_AUTH_PRIVATE_KEY,
}: {
  maxRequestSize?: number
  port?: number | null
  google_auth_client_email?: string
  google_auth_private_key?: string
}): Promise<http.Server> {
  // Loads credentials from either:
  // * GOOGLE_APPLICATION_CREDENTIALS which specifies a path to a credentials json file
  // OR
  // * GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY which specify the information directly
  const sheetsApi = google.sheets({
    version: "v4",
    auth: await new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      ...(google_auth_client_email && google_auth_private_key
        ? {
            credentials: {
              client_email: google_auth_client_email,
              private_key: google_auth_private_key,
            },
          }
        : {}),
    }).getClient(),
  })

  const router = setupRouter(sheetsApi)

  const server = http.createServer(async (request, response) => {
    // Tag each request so that log messages are easier to follow
    const taggedRequest = TagIncomingMessage(request)
    try {
      const parsedReq = {
        ...(await parseRequestUrl(taggedRequest)),
        ...(await parseRequestBody(taggedRequest, maxRequestSize)),
      }
      await router.route([request.method, parsedReq.virtualResource], {
        request: taggedRequest,
        parsedReq,
      })
    } catch (e) {
      // Successful responses (ie. 200s) will be handled as thrown
      // HttpResponses as well, not just error codes. This allows
      // any layer of the request processing to trigger a response if
      // necessary, and allow it to bubble up through JavaScript's
      // exceptions mechanism. Any caller can manipulate/prevent the
      // response by wrapping the call in a try-catch.
      if (e instanceof HttpResponse) {
        const payload = JSON.stringify(e.payload, undefined, 2)
        if (e.statusCode === 200) {
          Log.info(
            `[${taggedRequest.id}]response=200, length=${payload.length}`
          )
          Log.traceIf(() => [`[${taggedRequest.id}]response-trace=%j`, e])
        } else Log.info(`[${taggedRequest.id}]response=%j`, e)
        response.writeHead(e.statusCode, {
          "Content-Type": "application/json",
          ...(e.headers ?? {}),
        })
        response.end(payload, "utf-8")
        return
      }
      // Though it would be most convenient for a developer to simply
      // receive the underlying error right in the response, the potential
      // to leak sensitive information is too high, so any unknown errors
      // will be returned as empty 500s and logged to the console.
      Log.error(e)
      response.writeHead(500)
      response.end()
    }
  })
  if (port) {
    server.listen(port)
    Log.info(`Listening for HTTP requests on localhost:${port}`)
  }
  return server
}

// Run the server if this module is being executed directly by node
if (require.main === module) {
  runServer({}).catch((e) => {
    Log.error(e)
    process.exit(1)
  })
}

////////////////////
// Request Router //
////////////////////

type ParsedRequest = ParsedUrlInfo & ParsedBody
function setupRouter(sheetsApi: sheets_v4.Sheets) {
  return new Router<
    [string | undefined, string | undefined],
    {
      request: TaggedIncomingMessage
      parsedReq: ParsedRequest
    }
  >(({ request, parsedReq }) => {
    throw new HttpResponse(405, {
      message: `Only {GET, POST} requests methods are supported`,
    })
  })
    .error(({ error: e, request, parsedReq }) => {
      if (e instanceof SheetsDAL.errors.RedactedError) {
        Log.traceIf(() => [
          `[${request.id}]redacted-error`,
          util.inspect(e, { depth: 10 }),
        ])
        throw new HttpResponse(e.httpStatusCode, e.redactedInfo)
      }
      throw e // either an HttpResponse or an error that'll be wrapped into a 500
    })
    .add(["GET", "describe"], async ({ request, parsedReq }) => {
      const payload = await SheetsDAL.describe(sheetsApi, {
        spreadsheetId: parsedReq.spreadsheetId,
        sheetName: parsedReq.sheetName,
      })
      throw new HttpResponse(200, payload)
    })
    .add(["GET", undefined], async ({ request, parsedReq }) => {
      const { offset, limit } = parsedReq.queryParams as any
      // TODO validate offset and limit
      const payload = await SheetsDAL.get(sheetsApi, {
        spreadsheetId: parsedReq.spreadsheetId,
        sheetName: parsedReq.sheetName,
        offset: offset && Number(offset),
        limit: offset && Number(limit),
      })
      throw new HttpResponse(200, payload)
    })
    .add(["POST", undefined], async ({ request, parsedReq }) => {
      let { strict } = parsedReq.queryParams as any
      if (strict) strict = strict == "true"
      // TODO validate strict
      if (!parsedReq.body || !Array.isArray(parsedReq.body))
        throw new HttpResponse(400, {
          message: `The request body must be in the form [{"header1": "value1", "header2": "value2"}, ...]`,
        })
      const payload = await SheetsDAL.append(sheetsApi, {
        spreadsheetId: parsedReq.spreadsheetId,
        sheetName: parsedReq.sheetName,
        data: parsedReq.body,
        strict,
      })
      throw new HttpResponse(200, payload)
    })
}

//////////////////////
// Helper functions //
//////////////////////

// Spreedsheet ID regex provided by https://web.archive.org/web/20200504075835/https://developers.google.com/sheets/api/guides/concepts#spreadsheet_id
// Sheet Name regex created manually (be overly lenient since restrictions are unknown)
const PATH_REGEX = /\/(?<spreadsheetId>[a-zA-Z0-9-_]+?)\/(?<sheetName>[^\/]+)(\/(?<virtualResource>[^\/]+))?/

type ParsedUrlInfo = {
  spreadsheetId: string
  sheetName: string
  virtualResource: string | undefined
  queryParams: { [k: string]: string | undefined }
}

function parseRequestUrl(request: TaggedIncomingMessage): ParsedUrlInfo {
  Log.trace(`[${request.id}]url=%s`, request.url)
  const url = new URL(request.url!, `http://${request.headers.host}`) // TODO when can the URL be undefined?
  const rawPathInfo = PATH_REGEX.exec(url.pathname)?.groups
  Log.trace(`[${request.id}]parsed-url=%j`, url)
  if (!rawPathInfo)
    throw new HttpResponse(400, {
      message: `Request URLs should be in the form /SPREADSHEET_ID/SHEET_NAME[/optionalSubCommand]?optional_param=value`,
    })
  const parsedInfo = {
    spreadsheetId: decodeURIComponent(rawPathInfo.spreadsheetId),
    sheetName: decodeURIComponent(rawPathInfo.sheetName),
    virtualResource:
      rawPathInfo.virtualResource &&
      decodeURIComponent(rawPathInfo.virtualResource),
    queryParams: Object.fromEntries(url.searchParams.entries()),
  }
  Log.info(`[${request.id}]parsed-request%j`, parsedInfo)
  return parsedInfo
}

type ParsedBody = {
  body: any | undefined
}

async function parseRequestBody(
  request: TaggedIncomingMessage,
  maxRequestSize: number
): Promise<ParsedBody> {
  const body = await readRequestBody(request, { maxRequestSize })
  Log.traceIf(async () => [`[${request.id}]body=%s`, await body?.asString()])
  return { body: await body?.asJson() }
}
