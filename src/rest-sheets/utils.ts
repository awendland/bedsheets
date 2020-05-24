import { Headers, FormattedSheetRow, Header } from "./common"

/**
 * Convert a 2-dimensional array in row-major order into an object with the given
 * set of keys corresponding to the same-indexed column in each row.
 *
 * If the keys are shorter than the row lengths, then extra row data will be ignored.
 * If the keys are longer than the row lengths, then `undefined` values will be used
 * instead.
 *
 * See the test cases for examples.
 *
 * @param keys
 * @param values2d
 */
export function objectsFromRowMajor2D<T>(
  keys: ArrayLike<keyof T>,
  values2d: ArrayLike<ArrayLike<any>>
): Array<{ [k in keyof T]: any }> {
  const arr = new Array(values2d.length)
  for (let ai = 0; ai < values2d.length; ++ai) {
    const o: { [k in keyof T]: any } = {} as any
    for (let ki = 0; ki < keys.length; ++ki) {
      o[keys[ki]] = values2d[ai][ki]
    }
    arr[ai] = o
  }
  return arr
}

export type MalformedEntry<T> = {
  fields: { missing: Headers; extra: string[] }
  value: T
  index: number
}

/**
 * Convert a list of objects into a row-major order 2-dimensional array corresponding
 * to the given headers list. If `options.strict=true` then any extra or missing keys in
 * each object will be recorded any returned in an array of MalformedEntries. Regardless of
 * what `options.strict` is set to, the arrow of new SheetRows will have the same values.
 *
 * See the test cases for examples.
 *
 * @param headers
 * @param objects
 * @param options
 */
export function rowMajor2DFromObjects<T extends {}>(
  headers: Headers,
  objects: T[],
  { strict = true }: { strict: boolean }
): [Array<FormattedSheetRow>, Array<MalformedEntry<T>>] {
  const malformedEntries = []
  const newRows = []
  for (const [datumIndex, datum] of objects.entries()) {
    const row: FormattedSheetRow = []
    const missingFields: Headers = []
    // Fill in the rows according to the order of the header columns
    for (const header of headers) {
      if (strict && !datum.hasOwnProperty(header)) missingFields.push(header)
      // If the provided object does not align with the given sheet's headers, then
      // the row will have undefined values
      row.push((datum as any)[header])
    }
    if (
      strict &&
      (missingFields.length > 0 || Object.keys(datum).length !== row.length)
    ) {
      malformedEntries.push({
        fields: {
          missing: missingFields,
          extra: Object.keys(datum).filter(
            (k) => !headers.includes(k as Header)
          ),
        },
        value: datum,
        index: datumIndex,
      })
    }
    newRows.push(row)
  }
  return [newRows, malformedEntries]
}
