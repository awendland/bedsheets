export function objectsFrom2DRowMajor<T>(
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
