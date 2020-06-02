import { IncomingMessage } from "http"
import { HttpResponse } from "./http-objects"

export class RequestBody {
  constructor(public data: Buffer) {}

  string: string | undefined = undefined
  /**
   * Retrieve the request data as a string. This function is memoized, so subsequent
   * calls will return the same decoded string.
   *
   * @param encoding How to string decode the raw request data. Defaults to utf8.
   */
  public async asString(encoding: BufferEncoding = "utf8") {
    if (this.string) return this.string
    this.string = this.data.toString(encoding)
    return this.string
  }

  json: any | undefined = undefined
  /**
   * Retrieve the request data as JSON. This function is memoized, so subsequent
   * calls will return the same decoded JSON object.
   *
   * @param encoding How to string decode the raw request data. Defaults to utf8.
   */
  public async asJson(encoding: BufferEncoding = "utf8") {
    if (this.json) return this.json
    try {
      this.json = JSON.parse(await this.asString(encoding))
      return this.json
    } catch (e) {
      if (e instanceof SyntaxError)
        throw new HttpResponse(400, {
          message: e.message.substring(e.message.indexOf(":")),
        })
      throw e
    }
  }
}

/**
 * Ingest the body of a request and return RequestBody object, or undefined if the request
 * had no body.
 *
 * @param request
 * @param options.maxRequestSize Throw a 413 error if request bodies are larger than this. Defaults to 50 MiB.
 */
export function readRequestBody(
  request: IncomingMessage,
  {
    maxRequestSize = 50 * 2 ** 20,
  }: {
    maxRequestSize?: number
  }
): Promise<RequestBody | undefined> {
  const body: Uint8Array[] = []
  return new Promise((resolve, reject) => {
    request
      .on("data", (chunk) => {
        if (maxRequestSize && body.length + chunk.length > maxRequestSize) {
          return reject(new HttpResponse(413, {}))
        }
        body.push(chunk)
      })
      .on("end", () =>
        resolve(
          body.length > 0 ? new RequestBody(Buffer.concat(body)) : undefined
        )
      )
      .on("error", (e) => reject(e))
  })
}
