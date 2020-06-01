import * as SheetsDAL from "../../src"
import { objectsFromRowMajor2D } from "../../src/utils"
import { GoogleSheetsIntegration as GSI } from "@bedsheets/test-helpers"

const TEST_SHEETS = {
  Sheet1: {
    id: 1,
    title: "Sheet1",
    values: [
      ["name", "favorite_food", "age"],
      ["Catherine", "In-n-out", "23"],
      ["Gertrude", "Duck liver", "52"],
      ["Binh", "Salt", "33"],
    ],
  },
  Sheet2: {
    id: 2,
    title: "Sheet2",
    values: [
      ["name", "favorite_food", "age"],
      ...new Array(200).fill(["Catherine", "In-n-out", "23"]),
    ],
  },
  Sheet3: { id: 3, title: "Sheet3", values: [[]] },
}

const context = GSI.NewContext()
beforeAll(async () => await GSI.setupAPI(context))
beforeEach(async () => await GSI.setupSpreadsheet(context, TEST_SHEETS))
afterEach(async () => await GSI.teardownSpreadsheet(context, TEST_SHEETS))

///////////////////
// Standard Case //
///////////////////

test("get - Sheet1 - happy path", async () => {
  const resp = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
  })
  expect(resp.data).toEqual(
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1)
    )
  )
})

//////////////////////
// Limits & Offsets //
//////////////////////

test("get - Sheet1 - offset=null, limit=1", async () => {
  const resp = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    limit: 1,
  })
  expect(resp.data).toEqual(
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1, 2)
    )
  )
})

test("get - Sheet1 - offset=null, limit=0", async () => {
  const resp = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    limit: 0,
  })
  expect(resp.data).toEqual([])
})

test("get - Sheet1 - offset=0, limit=null", async () => {
  const resp = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 0,
  })
  expect(resp.data).toEqual(
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1)
    )
  )
})

test("get - Sheet1 - offset=0, limit=0", async () => {
  const resp = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 0,
    limit: 0,
  })
  expect(resp.data).toEqual([])
})

test("get - Sheet1 - offset=1, limit=null", async () => {
  const resp = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  expect(resp.data).toEqual(
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(2)
    )
  )
})

{
  const offset = TEST_SHEETS.Sheet2.values.length - 2
  test(`get - Sheet2 - offset=${offset}, limit=1`, async () => {
    const resp = await SheetsDAL.get(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      offset,
      limit: 1,
    })
    expect(resp.data).toEqual(
      objectsFromRowMajor2D(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })

  test(`get - Sheet2 - offset=${offset}, limit=null`, async () => {
    const resp = await SheetsDAL.get(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      offset,
    })
    expect(resp.data).toEqual(
      objectsFromRowMajor2D(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })

  test(`get - Sheet2 - offset=${offset}, limit=10 (overflow)`, async () => {
    const resp = await SheetsDAL.get(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      offset,
      limit: 10,
    })
    expect(resp.data).toEqual(
      objectsFromRowMajor2D(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })
}

{
  const offset = TEST_SHEETS.Sheet1.values.length - 1 + 10
  test(`get - Sheet1 - offset=${offset}, limit=null (past end of data)`, async () => {
    const resp = await SheetsDAL.get(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet1.title,
      offset,
    })
    expect(resp.data).toEqual([])
  })
}

test(`get - Sheet1!A2:B - offset=0, limit=1`, async () => {
  const resp = await SheetsDAL.get(context.sheetsApi, {
    spreadsheetId: context.spreadsheetId,
    sheetName: "Sheet1!A:B",
    limit: 1,
  })
  expect(resp.data).toEqual(
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1, 2)
    )
  )
})

////////////
// Errors //
////////////

test(`get - error - NotASheet - bad sheet`, async () => {
  const error = await expect(
    SheetsDAL.get(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: "NotASheet",
    })
  ).rejects
  error.toBeInstanceOf(SheetsDAL.errors.MissingSheetError)
  error.toMatchObject({ redactedInfo: { sheet: "NotASheet" } })
})

test(`get - error - Sheet3 - no headers`, async () => {
  const error = await expect(
    SheetsDAL.get(context.sheetsApi, {
      spreadsheetId: context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet3.title,
    })
  ).rejects
  error.toBeInstanceOf(SheetsDAL.errors.MisconfiguredSheetError)
  error.toMatchObject({
    redactedInfo: {
      reason: SheetsDAL.errors.MisconfigurationReason.NoHeaders,
      sheet: SheetsDAL.SheetName(TEST_SHEETS.Sheet3.title),
    },
  })
})
