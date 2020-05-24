import anyTest from "ava"

import * as RESTSheets from "../../../src/rest-sheets"
import { objectsFromRowMajor2D } from "../../../src/rest-sheets/utils"
import { setupIntegrationTest } from "./_common"
import { SheetName } from "../../../src/rest-sheets"

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

const test = setupIntegrationTest(anyTest, { seedSheets: TEST_SHEETS })

///////////////////
// Standard Case //
///////////////////

test("get - Sheet1 - happy path", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
  })
  t.deepEqual(
    resp.data,
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1)
    )
  )
})

//////////////////////
// Limits & Offsets //
//////////////////////

test("get - Sheet1 - offset=null, limit=1", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    limit: 1,
  })
  t.deepEqual(
    resp.data,
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1, 2)
    )
  )
})

test("get - Sheet1 - offset=null, limit=0", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    limit: 0,
  })
  t.deepEqual(resp.data, [])
})

test("get - Sheet1 - offset=0, limit=null", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 0,
  })
  t.deepEqual(
    resp.data,
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1)
    )
  )
})

test("get - Sheet1 - offset=0, limit=0", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 0,
    limit: 0,
  })
  t.deepEqual(resp.data, [])
})

test("get - Sheet1 - offset=1, limit=null", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  t.deepEqual(
    resp.data,
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(2)
    )
  )
})

{
  const offset = TEST_SHEETS.Sheet2.values.length - 2
  test(`get - Sheet2 - offset=${offset}, limit=1`, async (t) => {
    const resp = await RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      offset,
      limit: 1,
    })
    t.deepEqual(
      resp.data,
      objectsFromRowMajor2D(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })

  test(`get - Sheet2 - offset=${offset}, limit=null`, async (t) => {
    const resp = await RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      offset,
    })
    t.deepEqual(
      resp.data,
      objectsFromRowMajor2D(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })

  test(`get - Sheet2 - offset=${offset}, limit=10 (overflow)`, async (t) => {
    const resp = await RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet2.title,
      offset,
      limit: 10,
    })
    t.deepEqual(
      resp.data,
      objectsFromRowMajor2D(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })
}

{
  const offset = TEST_SHEETS.Sheet1.values.length - 1 + 10
  test(`get - Sheet1 - offset=${offset}, limit=null (past end of data)`, async (t) => {
    const resp = await RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet1.title,
      offset,
    })
    t.deepEqual(resp.data, [])
  })
}

test(`get - Sheet1!A2:B - offset=0, limit=1`, async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheetName: "Sheet1!A:B",
    limit: 1,
  })
  t.deepEqual(
    resp.data,
    objectsFromRowMajor2D(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1, 2)
    )
  )
})

////////////
// Errors //
////////////

test(`get - error - NotASheet - bad sheet`, async (t) => {
  const error = (await t.throwsAsync(
    RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: "NotASheet",
    }),
    {
      instanceOf: RESTSheets.InvalidSheetError,
    }
  )) as RESTSheets.InvalidSheetError
  t.deepEqual(error.redactedInfo.sheet, "NotASheet")
})

test(`get - error - Sheet3 - no headers`, async (t) => {
  const error = (await t.throwsAsync(
    RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheetName: TEST_SHEETS.Sheet3.title,
    }),
    {
      instanceOf: RESTSheets.MisconfiguredSheetError,
    }
  )) as RESTSheets.MisconfiguredSheetError
  t.deepEqual(error.redactedInfo, {
    reason: RESTSheets.MisconfigurationReason.NoHeaders,
    sheet: SheetName(TEST_SHEETS.Sheet3.title),
  })
})
