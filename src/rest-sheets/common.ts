export const HEADER_SIZE = 1
// TODO binary search to get exact & check with different column counts
export const MAX_ROW_COUNT = 210_000_000 // roughly the max row size that'll parse

export type Nullish<T> = T | null | undefined
export type FormattedSheetRow = (string | undefined)[] // numbers will be returned as strings

export type SheetName = string & { __nominal: "SheetName" }
/**
 * Sanitize to ensure there is no A1 notation
 */
export function SheetName(unsanitized: string): SheetName {
  return unsanitized.replace(/!.*$/, "") as SheetName
}

export type A1Notation = string & { __nominal: "A1Notation" }
export type Header = string & { __nomainal: "Header" }
export type Headers = Array<Header>
