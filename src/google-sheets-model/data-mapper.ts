import { sheets_v4 } from "googleapis"
import { objectsFromRowMajor2D, rowMajor2DFromObjects } from "./utils"
import {
  HEADER_SIZE,
  MAX_ROW_COUNT,
  Nullish,
  FormattedSheetRow,
  Headers,
  A1Notation,
  SheetName,
} from "./common"
import {
  redactErrors,
  MisconfiguredSheetError,
  MisconfigurationReason,
  BadDataError,
} from "./errors"

/**
 * Retrieve information about the schema and data in a specified sheet.
 *
 * e.g. the sheet
 *
 * | name  | age |
 * |-------|-----|
 * | Alex  | 23  |
 * | Emily | 27  |
 *
 * will translate to ==>
 *
 * ```json
 * {
 *   "headers": ["name", "age"]
 * }
 * ```
 *
 * @param client Authenticated Google Sheets client to use
 * @param options
 * @param options.spreadsheetId ID of the spreadsheet being accessed
 * @param options.sheetName Name of the Sheet (i.e. tab) in the spreadsheet to retrieve
 */
export const describe = redactErrors(async function _describe(
  client: sheets_v4.Sheets,
  {
    spreadsheetId,
    sheetName,
  }: {
    spreadsheetId: string
    sheetName: string
  }
): Promise<{ headers: Headers }> {
  const _enforceKnownHeaderSize: 1 = HEADER_SIZE // this will error if HEADER_SIZE is changed to an unacceptable value
  const sheet = SheetName(sheetName)
  const resp = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!1:${HEADER_SIZE}` as A1Notation,
  })
  if (!resp.data.values)
    throw new MisconfiguredSheetError({
      sheet,
      reason: MisconfigurationReason.NoHeaders,
    })
  const headers = (resp.data.values[0] as unknown) as Headers
  // TODO figure out guestimated type of data by first row
  return { headers }
})

/**
 * Retrieve data objects from a given sheet. These objects will be returned as an array, with each
 * row in the sheet being represented as a different object. The object keys are set by the column
 * headers and the object values set by the corresponding values in each row.
 *
 * e.g. the sheet
 *
 * | name  | age |
 * |-------|-----|
 * | Alex  | 23  |
 * | Emily | 27  |
 *
 * will translate to ==>
 *
 * ```json
 * [
 *   {
 *     "name": "Alex",
 *     "age": "23"
 *   },
 *   {
 *     "name": "Emily",
 *     "age": "27"
 *   }
 * ]
 * ```
 *
 * @param client Authenticated Google Sheets client to use
 * @param options
 * @param options.spreadsheetId ID of the spreadsheet being accessed
 * @param options.sheetName Name of the Sheet (i.e. tab) in the spreadsheet to retrieve
 * @param options.limit Optional limit on the number of rows returned
 * @param options.offset Optional number of rows to skip at the start of the dataset
 */
export const get = redactErrors(async function _get(
  client: sheets_v4.Sheets,
  {
    spreadsheetId,
    sheetName,
    limit = undefined,
    offset = 0,
  }: {
    spreadsheetId: string
    sheetName: string
    limit?: number
    offset?: number
  }
): Promise<{ data: Array<{}> }> {
  const _enforceKnownHeaderSize: 1 = HEADER_SIZE // this will error if HEADER_SIZE is changed to an unacceptable value
  const sheet = SheetName(sheetName)
  let headersRange = `'${sheet}'!1:${HEADER_SIZE}` as A1Notation
  const valuesRange = (() => {
    const startRow = (offset ?? 0) + HEADER_SIZE + 1
    const endRow = limit == null ? MAX_ROW_COUNT : startRow + limit - 1
    return `'${sheet}'!${startRow}:${endRow}` as A1Notation
  })()
  const resp = await client.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [headersRange, valuesRange],
  })
  const rawHeader: Nullish<Headers> = resp.data.valueRanges?.[0]
    .values?.[0] as Headers
  if (!rawHeader)
    throw new MisconfiguredSheetError({
      sheet,
      reason: MisconfigurationReason.NoHeaders,
    })
  const rawValues: Nullish<FormattedSheetRow[]> =
    resp.data.valueRanges?.[1].values ?? []
  const length = limit ?? rawValues.length // to ensure that limit = 0 works
  const data = objectsFromRowMajor2D(rawHeader as [], rawValues).slice(
    0,
    length
  )
  return { data }
})

/**
 * Add new objects into a sheet. The sheets column headers are used to determine what information
 * should be inserted.
 *
 * If `options.strict` is `true` (which is the default), then any extra or missing keys will throw a
 * BadDataError describing all the malformed objects encountered.
 *
 * If `options.strict` is `false`, then extra keys will be dropped and missing keys will
 * be set to `undefined` when inserted.
 *
 * e.g. calling append on the sheet
 *
 * | name  | age |
 * |-------|-----|
 * | Alex  | 23  |
 *
 * with the data
 *
 * ```json
 * [
 *   {
 *     "name": "Emily",
 *     "age": "27"
 *   }
 * ]
 * ```
 *
 * will result in ==>
 *
 * | name  | age |
 * |-------|-----|
 * | Alex  | 23  |
 * | Emily | 27  |
 *
 * OR if `options.strict=true` and the data was
 *
 * ```json
 * [
 *   {
 *     "first_name": "Emily",
 *     "age": "27",
 *     "favorite_food": "Z Pizza"
 *   }
 * ]
 * ```
 *
 * then an error would be thrown ==>
 *
 * ```
 * BadDataError {
 *  sheet: ...,
 *  entries: [
 *    {
 *      fields: {
 *        missing: ["name"],
 *        extra: ["favorite_food"]
 *      },
 *      value: {"first_name": "Emily", "age": 27, "favorite_food": "Z Pizza"},
 *      index: 0
 *    }
 *  ]
 * }
 * ```
 *
 * @param client Authenticated Google Sheets client to use
 * @param options
 * @param options.spreadsheetId ID of the spreadsheet being accessed
 * @param options.sheetName Name of the Sheet (i.e. tab) in the spreadsheet to retrieve
 * @param options.limit Optional limit on the number of rows returned
 * @param options.offset Optional number of rows to skip at the start of the dataset
 */
export const append = redactErrors(async function _append<T extends {}>(
  client: sheets_v4.Sheets,
  {
    spreadsheetId,
    sheetName,
    data,
    strict = true,
  }: {
    spreadsheetId: string
    sheetName: string
    data: Array<T>
    strict?: boolean
  }
): Promise<{ updatedRange: A1Notation; updatedRowCount: number }> {
  const sheet = SheetName(sheetName)
  const { headers } = await describe(client, { spreadsheetId, sheetName })

  if (strict && new Set(headers).size !== headers.length)
    throw new MisconfiguredSheetError({
      sheet,
      reason: MisconfigurationReason.DuplicateHeaders,
    })

  const [newRows, malformedEntries] = rowMajor2DFromObjects(headers, data, {
    strict,
  })
  if (strict && malformedEntries.length > 0)
    throw new BadDataError({ sheet, malformedEntries })

  const resp = await client.spreadsheets.values.append({
    spreadsheetId,
    range: sheet,
    valueInputOption: "RAW",
    requestBody: {
      values: newRows,
    },
  })

  return {
    updatedRange: resp.data.updates!.updatedRange as A1Notation,
    updatedRowCount: resp.data.updates!.updatedRows!,
  }
})
