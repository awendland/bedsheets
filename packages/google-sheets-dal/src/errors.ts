import { GaxiosError } from "gaxios"
import { SheetName } from "./common"
import { MalformedEntry } from "./utils"

export class RedactedError<I extends {}, E extends Error> extends Error {
  public httpStatusCode = 400
  constructor(
    public redactedInfo: I & {
      message?: string
    },
    public originalError?: E
  ) {
    super(redactedInfo.message)
    // TODO propagate constructor name to end user, e.g. MisconfiguredSheetError
  }

  public statusCode(code: number) {
    this.httpStatusCode = code
    return this
  }
}

export class MissingSpreadsheetError<
  E extends Error = Error
> extends RedactedError<{ spreadsheetId: string | null }, E> {
  public httpStatusCode = 404
}

export class MissingSheetError<E extends Error = Error> extends RedactedError<
  { sheet: SheetName },
  E
> {
  public httpStatusCode = 404
}

export enum MisconfigurationReason {
  NoHeaders = "NO_HEADERS",
  DuplicateHeaders = "DUPLICATE_HEADERS",
}

export class MisconfiguredSheetError<
  E extends Error = Error
> extends RedactedError<
  { sheet: SheetName; reason: MisconfigurationReason },
  E
> {
  public httpStatusCode = 502
}

export class TooManyRequestsError<
  E extends Error = Error
> extends RedactedError<{}, E> {
  public httpStatusCode = 429
}

export class BadDataError<
  T extends {} = {},
  E extends Error = Error
> extends RedactedError<
  { sheet: SheetName; malformedEntries: Array<MalformedEntry<T>> },
  E
> {
  public httpStatusCode = 400
}

const RE_INVALID_RANGE = /Unable to parse range: '?(.+?)'?(!(.+))?$/
const RE_URL_SPREADSHEET_ID = /v4\/spreadsheets\/([a-zA-Z0-9-_]+?)\//

export function redactErrors<T extends (..._: any[]) => PromiseLike<any>>(
  fn: T
) {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof RedactedError) throw e
      if (e instanceof GaxiosError) {
        if (e.response?.status == 429) {
          // TODO test that this exists
          throw new TooManyRequestsError(e)
        }
        if (e.response?.status == 404) {
          const spreadsheetId =
            RE_URL_SPREADSHEET_ID.exec(e.config.url ?? "")?.[1] ?? null
          throw new MissingSpreadsheetError({
            spreadsheetId,
            message: e.message,
          })
        }
        {
          const invalidRange = RE_INVALID_RANGE.exec(e.message)
          if (invalidRange?.[1]) {
            const sheet = SheetName(invalidRange[1])
            throw new MissingSheetError({ sheet, message: e.message }, e)
          }
        }
        throw new RedactedError({ message: e.message }, e).statusCode(
          e.response?.status ?? 400
        )
      }
      throw new RedactedError({ message: e.message }, e)
    }
  }
}
