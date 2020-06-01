import { rowMajor2DFromObjects } from "../../src/utils"
import { Headers } from "../../src"

test("rowMajor2DFromObjects - no objects, not strict", async () => {
  expect(
    rowMajor2DFromObjects(["name", "age"] as Headers, [], { strict: false })
  ).toEqual([[], []])
})

test("rowMajor2DFromObjects - no objects, strict", async () => {
  expect(
    rowMajor2DFromObjects(["name", "age"] as Headers, [], { strict: true })
  ).toEqual([[], []])
})

{
  const headers = ["name"] as Headers
  const objects = [{ name: "Rebecca", age: "23" }]
  const newRows = [["Rebecca"]]

  test("rowMajor2DFromObjects - extra keys, not strict", async () => {
    expect(rowMajor2DFromObjects(headers, objects, { strict: false })).toEqual([
      newRows,
      [],
    ])
  })

  test("rowMajor2DFromObjects - extra keys, strict", async () => {
    expect(rowMajor2DFromObjects(headers, objects, { strict: true })).toEqual([
      newRows,
      [
        {
          fields: { missing: [], extra: ["age"] },
          value: objects[0],
          index: 0,
        },
      ],
    ])
  })
}

{
  const headers = ["name", "age", "color"] as Headers
  const objects = [{ name: "Rebecca", age: "23" }]
  const newRows = [["Rebecca", "23", undefined]]

  test("rowMajor2DFromObjects - missing keys, not strict", async () => {
    expect(rowMajor2DFromObjects(headers, objects, { strict: false })).toEqual([
      newRows,
      [],
    ])
  })

  test("rowMajor2DFromObjects - missing keys, strict", async () => {
    expect(rowMajor2DFromObjects(headers, objects, { strict: true })).toEqual([
      newRows,
      [
        {
          fields: { missing: ["color"] as Headers, extra: [] },
          value: objects[0],
          index: 0,
        },
      ],
    ])
  })
}

test("rowMajor2DFromObjects - 1 object", async () => {
  expect(
    rowMajor2DFromObjects(
      ["name", "age", "color"] as Headers,
      [{ age: "23", name: "Rebecca", color: "blue" }],
      {
        strict: true,
      }
    )
  ).toEqual([[["Rebecca", "23", "blue"]], []])
})

test("rowMajor2DFromObjects - 10 objects", async () => {
  const obj = { age: "23", name: "Rebecca", color: "blue" }
  const values = ["Rebecca", "23", "blue"]
  expect(
    rowMajor2DFromObjects(
      ["name", "age", "color"] as Headers,
      new Array(10).fill(obj),
      { strict: true }
    )
  ).toEqual([new Array(10).fill(values), []])
})

test("rowMajor2DFromObjects - 10 objects, malformed differently", async () => {
  const obj_missing = { name: "Rebecca", age: "23" }
  const obj_extra = {
    name: "Rebecca",
    age: "23",
    color: "blue",
    food: "pickles",
  }
  const objects = new Array(10).fill(obj_missing, 0, 5).fill(obj_extra, 5, 10)
  const [newRows, malformedEntries] = rowMajor2DFromObjects(
    ["name", "age", "color"] as Headers,
    objects,
    { strict: true }
  )
  expect(newRows).toEqual(
    new Array(10)
      .fill(["Rebecca", "23", undefined], 0, 5)
      .fill(["Rebecca", "23", "blue"], 5, 10)
  )
  expect(malformedEntries).toEqual(
    new Array(10).fill(null).map((_, i) => ({
      fields: {
        missing: (i < 5 ? ["color"] : []) as Headers,
        extra: i < 5 ? [] : ["food"],
      },
      value: i < 5 ? obj_missing : obj_extra,
      index: i,
    }))
  )
})
