import anyTest from "ava"
import { setupIntegrationTest } from "../_common"
import {
  FormattedSheetRow,
  MAX_ROW_COUNT,
} from "../../../src/google-sheets-model"

const TEST_SHEETS = {
  Sheet1: {
    id: 1,
    title: "Sheet1",
    values: ([
      ["name", "favorite_food", "age"],
      ["Catherine", "In-n-out", 23], // notice that ages are numbers, not strings
      ["Gertrude", undefined, 52], // notice the undefined value in the middle
      ["Binh", "Salt", undefined], // notice the undefined value at the end
    ] as unknown) as FormattedSheetRow[],
  },
}

const test = setupIntegrationTest(anyTest, { seedSheets: TEST_SHEETS })

test("sheets_v4 - sheets return strings even for cells with numbers", async (t) => {
  const resp = await t.context.sheetsApi.spreadsheets.values.get({
    spreadsheetId: t.context.spreadsheetId,
    range: `${TEST_SHEETS.Sheet1.title}!C2`,
    valueRenderOption: "FORMATTED_VALUE",
  })
  t.is(resp.data.values?.[0][0], "23")
  t.not(resp.data.values?.[0][0], 23)
})

test("sheets_v4 - sheets converts surrounded undefined values into empty strings", async (t) => {
  const resp = await t.context.sheetsApi.spreadsheets.values.get({
    spreadsheetId: t.context.spreadsheetId,
    range: `${TEST_SHEETS.Sheet1.title}!3:3`,
    valueRenderOption: "FORMATTED_VALUE",
  })
  t.deepEqual(resp.data.values?.[0], ["Gertrude", "", "52"])
  t.notDeepEqual(resp.data.values?.[0], ["Gertrude", undefined, "52"])
})

test("sheets_v4 - sheets leaves off tailing undefined values even if explicitly requested", async (t) => {
  const resp_get = await t.context.sheetsApi.spreadsheets.values.get({
    spreadsheetId: t.context.spreadsheetId,
    range: `${TEST_SHEETS.Sheet1.title}!A4:D4`,
    valueRenderOption: "FORMATTED_VALUE",
  })
  t.deepEqual(resp_get.data.values?.[0], ["Binh", "Salt"])
  t.notDeepEqual(resp_get.data.values?.[0], ["Binh", "Salt", undefined])
})

// Binary search w/ exponential increase to find the max row count
test.todo(`sheets_v4 - max row count in ranges is ${MAX_ROW_COUNT}`)
