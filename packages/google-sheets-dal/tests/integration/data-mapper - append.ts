import * as SheetsDAL from "../../src"
import { GoogleSheetsIntegration as GSI } from "@bedsheets/test-helpers"

const TEST_SHEETS = {
  Sheet1: {
    id: 1,
    title: "Sheet1",
    values: [
      ["name", "favorite_food", "age"],
      ["Catherine", "In-n-out", "23"],
    ],
  },
  Sheet2: {
    id: 2,
    title: "Sheet2",
    values: [
      ["name", "favorite_food", "favorite_food"],
      ["Catherine", "In-n-out", "23"],
    ],
  },
}

const context = GSI.NewContext()
beforeAll(async () => await GSI.setupAPI(context))
beforeEach(async () => await GSI.setupSpreadsheet(context, TEST_SHEETS))
afterEach(async () => await GSI.teardownSpreadsheet(context, TEST_SHEETS))

///////////////////
// Standard Case //
///////////////////

test("append - Sheet1 - happy path w/ 1 object", async () => {
  const object = {
    name: "Stacie",
    favorite_food: "Udon",
    age: "54",
  }
  const resp_append = await SheetsDAL.append(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    data: [object],
  })
  expect(resp_append).toEqual({
    updatedRange: `${TEST_SHEETS.Sheet1.title}!A3:C3`,
    updatedRowCount: 1,
  })
  const resp_get = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  expect(resp_get).toEqual({ data: [object] })
})

test("append - Sheet1 - happy path w/ 200 objects", async () => {
  const data = new Array(200).fill({
    name: "Stacie",
    favorite_food: "Udon",
    age: "54",
  })
  const resp_append = await SheetsDAL.append(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    data,
  })
  expect(resp_append).toEqual({
    updatedRange: `${TEST_SHEETS.Sheet1.title}!A3:C202`,
    updatedRowCount: 200,
  })
  const resp_get = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  expect(resp_get).toEqual({ data })
})

////////////
// Errors //
////////////

test(`append - error - NotASheet - bad sheet`, async () => {
  const error = await expect(
    SheetsDAL.append(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: "NotASheet",
      data: [],
    })
  ).rejects
  error.toBeInstanceOf(SheetsDAL.errors.MissingSheetError)
  error.toMatchObject({ redactedInfo: { sheet: "NotASheet" } })
})

test(`append - error - Sheet1 - missing + extra keys`, async () => {
  const datum = {
    name: "Stacie",
    favorite_food: "Udon",
    weight: "439 kg",
  }
  const error = await expect(
    SheetsDAL.append(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet1.title,
      data: [datum],
    })
  ).rejects
  error.toBeInstanceOf(SheetsDAL.errors.BadDataError)
  error.toMatchObject({
    redactedInfo: {
      sheet: SheetsDAL.SheetName(TEST_SHEETS.Sheet1.title),
      malformedEntries: [
        {
          value: datum,
          index: 0,
          fields: {
            missing: ["age"] as SheetsDAL.Headers,
            extra: ["weight"],
          },
        },
      ],
    },
  })
})

test("append - Sheet1 - missing + extra keys but not strict", async () => {
  const resp_append = await SheetsDAL.append(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    data: [{ name: "Stacie", age: "54", weight: "439 kg" }],
    strict: false,
  })
  expect(resp_append).toEqual({
    // If favorite_food was missing, which is the second column, then the
    // updatedRange would be A3:B3
    updatedRange: `${TEST_SHEETS.Sheet1.title}!A3:C3`,
    updatedRowCount: 1,
  })
  const resp_get = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  expect(resp_get).toEqual({
    data: [
      {
        name: "Stacie",
        age: "54",
        favorite_food: "", // empty string instead of undefined b/c it's a middle column
      },
    ],
  })
})

test("append - error - Sheet2 - duplicate headers", async () => {
  const error = await expect(
    SheetsDAL.append(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      data: [{}],
    })
  ).rejects
  error.toBeInstanceOf(SheetsDAL.errors.MisconfiguredSheetError)
  error.toMatchObject({
    redactedInfo: {
      sheet: SheetsDAL.SheetName(TEST_SHEETS.Sheet2.title),
      reason: SheetsDAL.errors.MisconfigurationReason.DuplicateHeaders,
    },
  })
})
