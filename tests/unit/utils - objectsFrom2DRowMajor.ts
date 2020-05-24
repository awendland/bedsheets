import test from "ava"
import { objectsFromRowMajor2D } from "../../src/rest-sheets/utils"

test("objectsFromRowMajor2D - no values", async (t) => {
  t.deepEqual(objectsFromRowMajor2D(["name", "age", "color"], [[]]), [
    { name: undefined, age: undefined, color: undefined },
  ])
})

test("objectsFromRowMajor2D - extra values", async (t) => {
  t.deepEqual(objectsFromRowMajor2D(["name"], [["Rebecca", 23]]), [
    { name: "Rebecca" },
  ])
})

test("objectsFromRowMajor2D - no headers", async (t) => {
  t.deepEqual(objectsFromRowMajor2D([], [["Rebecca", 23, "blue"]]), [{}])
})

test("objectsFromRowMajor2D - extra headers", async (t) => {
  t.deepEqual(objectsFromRowMajor2D(["name", "age"], [["Rebecca"]]), [
    { name: "Rebecca", age: undefined },
  ])
})

test("objectsFromRowMajor2D - 1 value", async (t) => {
  t.deepEqual(
    objectsFromRowMajor2D(["name", "age", "color"], [["Rebecca", 23, "blue"]]),
    [{ name: "Rebecca", age: 23, color: "blue" }]
  )
})

test("objectsFromRowMajor2D - 2 values", async (t) => {
  t.deepEqual(
    objectsFromRowMajor2D(["name", "age", "color"], [["Rebecca", 23, "blue"]]),
    [{ name: "Rebecca", age: 23, color: "blue" }]
  )
})

test("objectsFromRowMajor2D - 1000 values", async (t) => {
  const values = ["Rebecca", 23, "blue"]
  const obj = { name: "Rebecca", age: 23, color: "blue" }
  t.deepEqual(
    objectsFromRowMajor2D(
      ["name", "age", "color"],
      new Array(1000).fill(values)
    ),
    new Array(1000).fill(obj)
  )
})
