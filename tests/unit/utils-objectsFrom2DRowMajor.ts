import test from "ava"
import { objectsFrom2DRowMajor } from "../../src/utils"

test("objectsFrom2DRowMajor - no values", async (t) => {
  t.deepEqual(objectsFrom2DRowMajor(["name", "age", "color"], [[]]), [
    { name: undefined, age: undefined, color: undefined },
  ])
})

test("objectsFrom2DRowMajor - extra values", async (t) => {
  t.deepEqual(objectsFrom2DRowMajor(["name"], [["Rebecca", 23]]), [
    { name: "Rebecca" },
  ])
})

test("objectsFrom2DRowMajor - no headers", async (t) => {
  t.deepEqual(objectsFrom2DRowMajor([], [["Rebecca", 23, "blue"]]), [{}])
})

test("objectsFrom2DRowMajor - extra headers", async (t) => {
  t.deepEqual(objectsFrom2DRowMajor(["name", "age"], [["Rebecca"]]), [
    { name: "Rebecca", age: undefined },
  ])
})

test("objectsFrom2DRowMajor - 1 value", async (t) => {
  t.deepEqual(
    objectsFrom2DRowMajor(["name", "age", "color"], [["Rebecca", 23, "blue"]]),
    [{ name: "Rebecca", age: 23, color: "blue" }]
  )
})

test("objectsFrom2DRowMajor - 2 values", async (t) => {
  t.deepEqual(
    objectsFrom2DRowMajor(["name", "age", "color"], [["Rebecca", 23, "blue"]]),
    [{ name: "Rebecca", age: 23, color: "blue" }]
  )
})

test("objectsFrom2DRowMajor - 1000 values", async (t) => {
  const values = ["Rebecca", 23, "blue"]
  const obj = { name: "Rebecca", age: 23, color: "blue" }
  t.deepEqual(
    objectsFrom2DRowMajor(
      ["name", "age", "color"],
      new Array(1000).fill(values)
    ),
    new Array(1000).fill(obj)
  )
})
