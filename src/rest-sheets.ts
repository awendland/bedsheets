import {sheets_v4} from 'googleapis'

export const HEADER_SIZE = 1

export type Nullish<T> = T | null | undefined
export type SheetRow = (string | number)[] // FIXME can a number be returned?

export async function head(
  client: sheets_v4.Sheets,
  {spreadsheetId, sheet, limit, offset = 0}: {
    spreadsheetId: string,
    sheet: string,
    limit?: number,
    offset?: number
  }
): Promise<Array<{}>> {
  const _enforceKnownHeaderSize: 1 = HEADER_SIZE // this will error if HEADER_SIZE is changed to an unacceptable value
  const resp = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!1:${HEADER_SIZE}`, // TODO only pull minimum set of data required
  })
  console.time('HEAD processing')
  if (!resp.data.values) throw new Error('TODO unconfigured sheet')
  const header = resp.data.values[0];
  // TODO figure out guestimated type of data by first row
  console.timeEnd('HEAD processing')
  return header
}


export async function get(
  client: sheets_v4.Sheets,
  {spreadsheetId, sheet, limit, offset = 0}: {
    spreadsheetId: string,
    sheet: string,
    limit?: number,
    offset?: number
  }
): Promise<Array<{}>> {
  const _enforceKnownHeaderSize: 1 = HEADER_SIZE // this will error if HEADER_SIZE is changed to an unacceptable value
  const valuesRange = (() => {
    const startRow = (offset ?? 0) + HEADER_SIZE + 1
    const endRow = limit == null
      ? 210000000 // TODO roughly the max row size (binary search to get exact)
      : startRow + limit - 1
    return `'${sheet}'!${startRow}:${endRow}`
  })()
  let headersRange = `'${sheet}'!1:${HEADER_SIZE}`
  const resp = await client.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [headersRange, valuesRange],
  })
  console.time('GET processing')
  const rawHeader: Nullish<SheetRow> = resp.data.valueRanges?.[0].values?.[0]
  const rawValues: Nullish<SheetRow[]> = resp.data.valueRanges?.[1].values
  if (!rawHeader || !rawValues) throw new Error('TODO unconfigured sheet')
  const length = limit ?? rawValues.length // to ensure that limit = 0 works
  const respArr = new Array(length)
  for (let i = 0; i < length; ++i) {
    const row = rawValues[i]
    respArr[i] = Object.fromEntries(rawHeader.map((h, c) => [h, row[c]]))
  }
  console.timeEnd('GET processing')
  return respArr
}
