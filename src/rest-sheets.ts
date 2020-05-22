import { sheets_v4 } from "googleapis"
import { objectsFrom2DRowMajor } from "./utils"
import { GaxiosError } from "gaxios"

export const HEADER_SIZE = 1
// TODO binary search to get exact & check with different column counts
export const MAX_ROW_COUNT = 210_000_000 // roughly the max row size that'll parse

export type Nullish<T> = T | null | undefined
export type SheetRow = (string | number)[] // FIXME can a number be returned?

export class RedactedError<I extends {}, E extends Error> extends Error {
  constructor(
    public redactedInfo: I & { message?: string },
    public originalError?: E
  ) {
    super(redactedInfo.message)
    // TODO propagate constructor name to end user, e.g. MisconfiguredSheetError
  }
}

export class InvalidSheetError<E extends Error = Error> extends RedactedError<
  { sheet: string },
  E
> {}

export enum MisconfigurationReason {
  NoHeaders = "NO_HEADERS",
}

export class MisconfiguredSheetError<
  E extends Error = Error
> extends RedactedError<{ sheet: string; reason: MisconfigurationReason }, E> {}

export class TooManyRequestsError<
  E extends Error = Error
> extends RedactedError<{}, E> {}

export async function head(
  client: sheets_v4.Sheets,
  {
    spreadsheetId,
    sheet,
    limit,
    offset = 0,
  }: {
    spreadsheetId: string
    sheet: string
    limit?: number
    offset?: number
  }
): Promise<Array<{}>> {
  const _enforceKnownHeaderSize: 1 = HEADER_SIZE // this will error if HEADER_SIZE is changed to an unacceptable value
  const resp = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!1:${HEADER_SIZE}`, // TODO only pull minimum set of data required
  })
  console.time("HEAD processing")
  if (!resp.data.values) throw new Error("TODO unconfigured sheet")
  const header = resp.data.values[0]
  // TODO figure out guestimated type of data by first row
  console.timeEnd("HEAD processing")
  return header
}

async function _get(
  client: sheets_v4.Sheets,
  {
    spreadsheetId,
    sheet,
    limit,
    offset = 0,
  }: {
    spreadsheetId: string
    sheet: string
    limit?: number
    offset?: number
  }
): Promise<Array<{}>> {
  const _enforceKnownHeaderSize: 1 = HEADER_SIZE // this will error if HEADER_SIZE is changed to an unacceptable value
  sheet = sheet.replace(/!.*$/, "") // Sanitize to ensure there is no A1 notation
  const valuesRange = (() => {
    const startRow = (offset ?? 0) + HEADER_SIZE + 1
    const endRow = limit == null ? MAX_ROW_COUNT : startRow + limit - 1
    return `'${sheet}'!${startRow}:${endRow}`
  })()
  let headersRange = `'${sheet}'!1:${HEADER_SIZE}`
  const resp = await client.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [headersRange, valuesRange],
  })
  const rawHeader: Nullish<SheetRow> = resp.data.valueRanges?.[0].values?.[0]
  const rawValues: Nullish<SheetRow[]> = resp.data.valueRanges?.[1].values ?? []
  if (!rawHeader)
    throw new MisconfiguredSheetError({
      sheet,
      reason: MisconfigurationReason.NoHeaders,
    })
  const length = limit ?? rawValues.length // to ensure that limit = 0 works
  const respArr = objectsFrom2DRowMajor(rawHeader, rawValues).slice(0, length)
  return respArr
}

export const get = redactErrors(_get)

const RE_INVALID_RANGE = /Unable to parse range: '(.+?)'(!(.+))?$/

function redactErrors<T extends (..._: any[]) => PromiseLike<any>>(fn: T) {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof RedactedError) throw e
      if (e instanceof GaxiosError) {
        const invalidRange = RE_INVALID_RANGE.exec(e.message)
        if (invalidRange?.[1]) {
          const sheet = invalidRange[1]
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
