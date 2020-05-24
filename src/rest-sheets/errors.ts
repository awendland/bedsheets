import { GaxiosError } from "gaxios"
import { Headers, SheetName } from "./common"
import { MalformedEntry } from "./utils"

export class RedactedError<I extends {}, E extends Error> extends Error {
  constructor(
    public redactedInfo: I & {
      message?: string
    },
    public originalError?: E
  ) {
    super(redactedInfo.message)
    // TODO propagate constructor name to end user, e.g. MisconfiguredSheetError
  }
}

export class InvalidSheetError<E extends Error = Error> extends RedactedError<
  { sheet: SheetName },
  E
> {}

export enum MisconfigurationReason {
  NoHeaders = "NO_HEADERS",
  DuplicateHeaders = "DUPLICATE_HEADERS",
}

export class MisconfiguredSheetError<
  E extends Error = Error
> extends RedactedError<
  { sheet: SheetName; reason: MisconfigurationReason },
  E
> {}

export class TooManyRequestsError<
  E extends Error = Error
> extends RedactedError<{}, E> {}

export class BadDataError<
  T extends {} = {},
  E extends Error = Error
> extends RedactedError<
  { sheet: SheetName; malformedEntries: Array<MalformedEntry<T>> },
  E
> {}

const RE_INVALID_RANGE = /Unable to parse range: '?(.+?)'?(!(.+))?$/

export function redactErrors<T extends (..._: any[]) => PromiseLike<any>>(
  fn: T
) {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof RedactedError) throw e
      if (e instanceof GaxiosError) {
        const invalidRange = RE_INVALID_RANGE.exec(e.message)
        if (invalidRange?.[1]) {
          const sheet = SheetName(invalidRange[1])
          throw new InvalidSheetError({ sheet, message: e.message }, e)
        }
        if (e.response?.status === 429) {
          // TODO test that this exists
          throw new TooManyRequestsError(e)
        }
      }
      throw new RedactedError({ message: e.message }, e)
    }
  }
}
