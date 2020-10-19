import * as util from "util"
import polka, { Middleware } from "polka"
import { RequestHandler } from "express"
import { json as parseBodyAsJson } from "milliparsec"
import * as D from "io-ts/lib/Decoder"
import { pipe } from "fp-ts/lib/pipeable"
import { fold } from "fp-ts/lib/Either"
import { sheets_v4 } from "googleapis"
import * as SheetsDAL from "@bedsheets/google-sheets-dal"
import * as Log from "./simple-logger"
import { readRequestBody } from "./body-parser"
import { flow, tuple, tupled } from "fp-ts/lib/function"

Log.setLevelByString(process.env.LOG_LEVEL ?? "INFO", false)

// Spreedsheet ID regex provided by https://web.archive.org/web/20200504075835/https://developers.google.com/sheets/api/guides/concepts#spreadsheet_id
// Sheet Name regex created manually (be overly lenient since restrictions are unknown)
const PATH_REGEX = /\/(?<spreadsheetId>[a-zA-Z0-9-_]+?)\/(?<sheetName>[^\/]+)(\/(?<virtualResource>[^\/]+))?/

///////////////////////
// Setup HTTP server //
///////////////////////
export async function runServer({
  maxRequestSize = parseInt(process.env.MAX_REQUEST_SIZE ?? "") || 50 * 2 ** 20, // 50 MiB
  port = parseInt(process.env.PORT ?? "") || 3141,
}: {
  maxRequestSize?: number
  port?: number | null
}): Promise<App> {
  const sheets = await SheetsDAL.auth.getSheetsClient(process.env as any)

  const server = polka({
    onNoMatch: (_req, res) => {
      res.statusCode = 404
      res.end({
        error: `Not found`,
        hint: `Try sending a GET request to '/$SPREADSHEET_ID/$SHEET_NAME/describe' to see the schema for a given sheet`,
      })
    },
  })

  server.use(parseBodyAsJson())

  function makeUnary<F extends (...a: any[]) => any>(f: F) {
    return (args: Parameters<F>) => f(...args)
  }

  const f =
    flow(
      ([req, res, next]) => decodeParamsAs(D.type({ offset: D.number, limit: D.number }))(req, res, next),
      (t) => void t,
      ([req, res, next]) => {
        const { offset, limit } = req.params
        // TODO validate offset and limit
        const payload = await SheetsDAL.get(sheetsApi, {
          spreadsheetId: parsedReq.spreadsheetId,
          sheetName: parsedReq.sheetName,
          offset: offset && Number(offset),
          limit: offset && Number(limit),
        })
        throw new HttpResponse(200, payload)
      }
    )

  server.get(
    "/:spreadsheetId/:sheetName",
  )

  server.post("/:spreadsheetId/:sheetName", async (req, res) => {
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

  server.get("/:spreadsheetId/:sheetName/describe", async (req, res) => {
    const payload = await SheetsDAL.describe(sheetsApi, {
      spreadsheetId: parsedReq.spreadsheetId,
      sheetName: parsedReq.sheetName,
    })
    throw new HttpResponse(200, payload)
  })

  server.use((err, req, res, next) => {
    if (e instanceof SheetsDAL.errors.RedactedError) {
      Log.traceIf(() => [
        `[${request.id}]redacted-error`,
        util.inspect(e, { depth: 10 }),
      ])
      return res.status(e.httpStatusCode).send(e.redactedInfo)
    }
    res.status(500).send({ error: "UNKNOWN" })
  })

  {
    // Tag each request so that log messages are easier to follow
    const taggedRequest = TagIncomingMessage(request)
    Log.trace(`[${taggedRequest.id}]headers=%j`, request.headers)
    try {
      const parsedReq = {
        ...(await parseRequestUrl(taggedRequest)),
        ...(await parseRequestBody(taggedRequest, maxRequestSize)),
        method: request.method,
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
        const headers = {
          "Content-Type": "application/json",
          ...(process.env.DISABLE_CORS == "true" ? {} : corsHeaders(request)),
          ...(e.headers ?? {}),
        }
        Log.trace(`[${taggedRequest.id}]response-headers=%j`, headers)
        response.writeHead(e.statusCode, headers)
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
  }
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
  >(({ request }) => {
    // TODO improve router to move OPTIONS out of the default handler and into
    // its own route (this is to enable CORS pre-flight requests)
    if (request.method === "OPTIONS") throw new HttpResponse(204)
    throw new HttpResponse(405, {
      message: `Only {GET, POST, OPTIONS} requests methods are supported`,
    })
  })
    .error(({ error: e, request }) => {
      if (e instanceof SheetsDAL.errors.RedactedError) {
        Log.traceIf(() => [
          `[${request.id}]redacted-error`,
          util.inspect(e, { depth: 10 }),
        ])
        throw new HttpResponse(e.httpStatusCode, e.redactedInfo)
      }
      throw e // either an HttpResponse or an error that'll be wrapped into a 500
    })
    .add(["GET", "describe"], async ({ parsedReq }) => {
      const payload = await SheetsDAL.describe(sheetsApi, {
        spreadsheetId: parsedReq.spreadsheetId,
        sheetName: parsedReq.sheetName,
      })
      throw new HttpResponse(200, payload)
    })
    .add(["GET", undefined], async ({ parsedReq }) => {
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
    .add(["POST", undefined], async ({ parsedReq }) => {
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

export const decodeParamsAs: <T, A>(
  decoder: D.Decoder<T, A>
) => RequestHandler<A> = (decoder) => (req, res, next) => {
  return pipe(
    decoder.decode(req.params),
    fold(
      (errors) => {
        res.status(400).send({ status: "error", message: D.draw(errors) })
      },
      () => next()
    )
  )
}

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
  Log.trace(`[${request.id}]url=%s %s`, request.method, request.url)
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
    queryParams: (() => {
      const obj: any = {}
      url.searchParams.forEach((v, k) => (obj[k] = v))
      return obj
    })(),
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

function echoHeader(
  request: IncomingMessage,
  header: string,
  newHeader: string = header
) {
  const value = request.headers[header]
  if (value) return { [newHeader]: value }
  return {}
}

function corsHeaders(request: IncomingMessage) {
  return {
    ...echoHeader(request, "origin", "access-control-allow-origin"),
    ...echoHeader(
      request,
      "access-control-request-headers",
      "access-control-allow-headers"
    ),
    ...echoHeader(
      request,
      "access-control-request-method",
      "access-control-allow-method"
    ),
    "access-control-max-age": Number.MAX_SAFE_INTEGER,
  }
}
