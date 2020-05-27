import { IncomingMessage } from "http"

/**
 * A simple data object for Http responses. These are intended to be thrown, like errors,
 * so that they can propagate up to the correct handlers that will in turn serialize
 * and send the response to the client.
 */
export class HttpResponse<P extends {} | undefined, H extends {} | undefined> {
  constructor(
    public statusCode: number,
    public payload?: P,
    public headers?: H
  ) {}
}

/**
 * A simple wrapper around an IncomingMessage which includes an ID property intended
 * to be used in logging (eg. to know which log messages apply to which requests).
 *
 * This ID is set as an monotonically increasing value starting at 0 and encoded in
 * hex for moderate line width savings.
 */
export type TaggedIncomingMessage = IncomingMessage & { id: string }
let _id = 0
export const TagIncomingMessage = (
  msg: IncomingMessage
): TaggedIncomingMessage => Object.assign(msg, { id: (_id++).toString(16) })
