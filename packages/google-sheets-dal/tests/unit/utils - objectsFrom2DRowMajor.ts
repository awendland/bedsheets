import { objectsFromRowMajor2D } from "../../src/utils"

test("objectsFromRowMajor2D - no values", async () => {
  expect(objectsFromRowMajor2D(["name", "age", "color"], [[]])).toEqual([
    { name: undefined, age: undefined, color: undefined },
  ])
})

test("objectsFromRowMajor2D - extra values", async () => {
  expect(objectsFromRowMajor2D(["name"], [["Rebecca", 23]])).toEqual([
    { name: "Rebecca" },
  ])
})

test("objectsFromRowMajor2D - no headers", async () => {
  expect(objectsFromRowMajor2D([], [["Rebecca", 23, "blue"]])).toEqual([{}])
})

test("objectsFromRowMajor2D - extra headers", async () => {
  expect(objectsFromRowMajor2D(["name", "age"], [["Rebecca"]])).toEqual([
    { name: "Rebecca", age: undefined },
  ])
})

test("objectsFromRowMajor2D - 1 value", async () => {
  expect(
    objectsFromRowMajor2D(["name", "age", "color"], [["Rebecca", 23, "blue"]])
  ).toEqual([{ name: "Rebecca", age: 23, color: "blue" }])
})

test("objectsFromRowMajor2D - 2 values", async () => {
  expect(
    objectsFromRowMajor2D(["name", "age", "color"], [["Rebecca", 23, "blue"]])
  ).toEqual([{ name: "Rebecca", age: 23, color: "blue" }])
})

test("objectsFromRowMajor2D - 1000 values", async () => {
  const values = ["Rebecca", 23, "blue"]
  const obj = { name: "Rebecca", age: 23, color: "blue" }
  expect(
    objectsFromRowMajor2D(
      ["name", "age", "color"],
      new Array(1000).fill(values)
    )
  ).toEqual(new Array(1000).fill(obj))
})
