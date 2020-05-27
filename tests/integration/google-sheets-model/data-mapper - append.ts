import anyTest from "ava"

import * as SheetsDAL from "../../../src/google-sheets-model"
import { setupIntegrationTest } from "../_common"

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

const test = setupIntegrationTest(anyTest, { seedSheets: TEST_SHEETS })

///////////////////
// Standard Case //
///////////////////

test("append - Sheet1 - happy path w/ 1 object", async (t) => {
  const object = {
    name: "Stacie",
    favorite_food: "Udon",
    age: "54",
  }
  const resp_append = await SheetsDAL.append(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    data: [object],
  })
  t.deepEqual(resp_append, {
    updatedRange: `${TEST_SHEETS.Sheet1.title}!A3:C3`,
    updatedRowCount: 1,
  })
  const resp_get = await SheetsDAL.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  t.deepEqual(resp_get, { data: [object] })
})

test("append - Sheet1 - happy path w/ 200 objects", async (t) => {
  const data = new Array(200).fill({
    name: "Stacie",
    favorite_food: "Udon",
    age: "54",
  })
  const resp_append = await SheetsDAL.append(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    data,
  })
  t.deepEqual(resp_append, {
    updatedRange: `${TEST_SHEETS.Sheet1.title}!A3:C202`,
    updatedRowCount: 200,
  })
  const resp_get = await SheetsDAL.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  t.deepEqual(resp_get, { data })
})

////////////
// Errors //
////////////

test(`append - error - NotASheet - bad sheet`, async (t) => {
  const error = (await t.throwsAsync(
    SheetsDAL.append(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: "NotASheet",
      data: [],
    }),
    {
      instanceOf: SheetsDAL.errors.MissingSheetError,
    }
  )) as SheetsDAL.errors.MissingSheetError
  t.deepEqual(error.redactedInfo.sheet, "NotASheet")
})

test(`append - error - Sheet1 - missing + extra keys`, async (t) => {
  const datum = {
    name: "Stacie",
    favorite_food: "Udon",
    weight: "439 kg",
  }
  const error = (await t.throwsAsync(
    SheetsDAL.append(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet1.title,
      data: [datum],
    }),
    {
      instanceOf: SheetsDAL.errors.BadDataError,
    }
  )) as SheetsDAL.errors.BadDataError
  t.deepEqual(error.redactedInfo, {
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
  })
})

test("append - Sheet1 - missing + extra keys but not strict", async (t) => {
  const resp_append = await SheetsDAL.append(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    data: [{ name: "Stacie", age: "54", weight: "439 kg" }],
    strict: false,
  })
  t.deepEqual(resp_append, {
    // If favorite_food was missing, which is the second column, then the
    // updatedRange would be A3:B3
    updatedRange: `${TEST_SHEETS.Sheet1.title}!A3:C3`,
    updatedRowCount: 1,
  })
  const resp_get = await SheetsDAL.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  t.deepEqual(resp_get, {
    data: [
      {
        name: "Stacie",
        age: "54",
        favorite_food: "", // empty string instead of undefined b/c it's a middle column
      },
    ],
  })
})

test("append - error - Sheet2 - duplicate headers", async (t) => {
  const error = (await t.throwsAsync(
    SheetsDAL.append(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      data: [{}],
    }),
    {
      instanceOf: SheetsDAL.errors.MisconfiguredSheetError,
    }
  )) as SheetsDAL.errors.MisconfiguredSheetError
  t.deepEqual(error.redactedInfo, {
    sheet: SheetsDAL.SheetName(TEST_SHEETS.Sheet2.title),
    reason: SheetsDAL.errors.MisconfigurationReason.DuplicateHeaders,
  })
})
