import anyTest, { TestInterface } from "ava"

import * as RESTSheets from "../../src/rest-sheets"
import { sheets_v4, google } from "googleapis"
import { objectsFrom2DRowMajor } from "../../src/utils"

// https://developers.google.com/sheets/api/limits
// As of 2020-02-21: 100 requests per 100 seconds
const RATE_LIMIT_DELAY_MS =
  Number.parseInt(process.env.RATE_LIMIT_DELAY_MS ?? "0") || 0

const test = anyTest as TestInterface<{
  sheetsApi: sheets_v4.Sheets
  spreadsheetId: string
}>

test.before(async (t) => {
  // Loads credentials from path specified in GOOGLE_APPLICATION_CREDENTIALS env var
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  const authClient = await auth.getClient()
  t.context.sheetsApi = google.sheets({ version: "v4", auth: authClient })

  t.context.spreadsheetId =
    process.env.TEST_SPREADSHEET_ID ??
    (() => {
      throw new Error(`Missing TEST_SPREADSHEET_ID`)
    })()

  // Ensure that the spreadsheet is accessible (this will throw a 403 if it's not)
  await t.context.sheetsApi.spreadsheets.get({
    spreadsheetId: t.context.spreadsheetId,
  })
})

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

test.beforeEach(async (t) => {
  const addSheets = () =>
    t.context.sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: t.context.spreadsheetId,
      requestBody: {
        requests: Object.entries(TEST_SHEETS).map(([k, p]) => ({
          addSheet: { properties: { sheetId: p.id, title: k } },
        })),
      },
    })
  try {
    await addSheets()
  } catch (e) {
    // The cleanup operation must have failed. Therefore, cleanup any outstanding
    // sheets and add each new sheet one by one.
    for (const [, { id: sheetId }] of Object.entries(TEST_SHEETS)) {
      try {
        // Try deleting any old sheet that's hanging around and blocking the add operation
        await t.context.sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId: t.context.spreadsheetId,
          requestBody: { requests: [{ deleteSheet: { sheetId } }] },
        })
      } catch (e) {}
    }
    await addSheets()
  }

  // Populate sheets with starter data
  await t.context.sheetsApi.spreadsheets.values.batchUpdate({
    spreadsheetId: t.context.spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: Object.values(TEST_SHEETS).map((p) => ({
        range: p.title,
        values: p.values,
      })),
    },
  })
})

test.afterEach(async (t) => {
  await t.context.sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: t.context.spreadsheetId,
    requestBody: {
      requests: Object.entries(TEST_SHEETS).map(([k, p]) => ({
        deleteSheet: { sheetId: p.id },
      })),
    },
  })

  await new Promise((res) => setTimeout(res, RATE_LIMIT_DELAY_MS))
})

///////////////////
// Standard Case //
///////////////////

test("get - Sheet1 - happy path", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheet: TEST_SHEETS.Sheet1.title,
  })
  t.deepEqual(
    resp,
    objectsFrom2DRowMajor(
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
    sheet: TEST_SHEETS.Sheet1.title,
    limit: 1,
  })
  t.deepEqual(
    resp,
    objectsFrom2DRowMajor(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1, 2)
    )
  )
})

test("get - Sheet1 - offset=null, limit=0", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheet: TEST_SHEETS.Sheet1.title,
    limit: 0,
  })
  t.deepEqual(resp, [])
})

test("get - Sheet1 - offset=0, limit=null", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheet: TEST_SHEETS.Sheet1.title,
    offset: 0,
  })
  t.deepEqual(
    resp,
    objectsFrom2DRowMajor(
      TEST_SHEETS.Sheet1.values[0],
      TEST_SHEETS.Sheet1.values.slice(1)
    )
  )
})

test("get - Sheet1 - offset=0, limit=0", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheet: TEST_SHEETS.Sheet1.title,
    offset: 0,
    limit: 0,
  })
  t.deepEqual(resp, [])
})

test("get - Sheet1 - offset=1, limit=null", async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheet: TEST_SHEETS.Sheet1.title,
    offset: 1,
  })
  t.deepEqual(
    resp,
    objectsFrom2DRowMajor(
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
      sheet: TEST_SHEETS.Sheet2.title,
      offset,
      limit: 1,
    })
    t.deepEqual(
      resp,
      objectsFrom2DRowMajor(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })

  test(`get - Sheet2 - offset=${offset}, limit=null`, async (t) => {
    const resp = await RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheet: TEST_SHEETS.Sheet2.title,
      offset,
    })
    t.deepEqual(
      resp,
      objectsFrom2DRowMajor(
        TEST_SHEETS.Sheet2.values[0],
        TEST_SHEETS.Sheet2.values.slice(-1)
      )
    )
  })

  test(`get - Sheet2 - offset=${offset}, limit=10 (overflow)`, async (t) => {
    const resp = await RESTSheets.get(t.context.sheetsApi, {
      spreadsheetId: t.context.spreadsheetId,
      sheet: TEST_SHEETS.Sheet2.title,
      offset,
      limit: 10,
    })
    t.deepEqual(
      resp,
      objectsFrom2DRowMajor(
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
      sheet: TEST_SHEETS.Sheet1.title,
      offset,
    })
    t.deepEqual(resp, [])
  })
}

test(`get - Sheet1!A2:B - offset=0, limit=1`, async (t) => {
  const resp = await RESTSheets.get(t.context.sheetsApi, {
    spreadsheetId: t.context.spreadsheetId,
    sheet: "Sheet1!A:B",
    limit: 1,
  })
  t.deepEqual(
    resp,
    objectsFrom2DRowMajor(
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
      sheet: "NotASheet",
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
      sheet: TEST_SHEETS.Sheet3.title,
    }),
    {
      instanceOf: RESTSheets.MisconfiguredSheetError,
    }
  )) as RESTSheets.MisconfiguredSheetError
  t.deepEqual(error.redactedInfo, {
    reason: RESTSheets.MisconfigurationReason.NoHeaders,
    sheet: TEST_SHEETS.Sheet3.title,
  })
})
