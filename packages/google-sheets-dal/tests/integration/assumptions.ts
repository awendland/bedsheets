import { GoogleSheetsIntegration as GSI } from "@bedsheets/test-helpers"
import { FormattedSheetRow, MAX_ROW_COUNT } from "../../src/"

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

const context = GSI.NewContext()
beforeAll(async () => await GSI.setupAPI(context))
beforeEach(async () => await GSI.setupSpreadsheet(context, TEST_SHEETS))
afterEach(async () => await GSI.teardownSpreadsheet(context, TEST_SHEETS))

test("sheets_v4 - sheets return strings even for cells with numbers", async () => {
  const resp = await context.sheetsApi.spreadsheets.values.get({
    spreadsheetId: context.spreadsheetId,
    range: `${TEST_SHEETS.Sheet1.title}!C2`,
    valueRenderOption: "FORMATTED_VALUE",
  })
  expect(resp.data.values?.[0][0]).toBe("23")
  expect(resp.data.values?.[0][0]).not.toBe(23)
})

test("sheets_v4 - sheets converts surrounded undefined values into empty strings", async () => {
  const resp = await context.sheetsApi.spreadsheets.values.get({
    spreadsheetId: context.spreadsheetId,
    range: `${TEST_SHEETS.Sheet1.title}!3:3`,
    valueRenderOption: "FORMATTED_VALUE",
  })
  expect(resp.data.values?.[0]).toEqual(["Gertrude", "", "52"])
  expect(resp.data.values?.[0]).not.toEqual(["Gertrude", undefined, "52"])
})

test("sheets_v4 - sheets leaves off tailing undefined values even if explicitly requested", async () => {
  const resp_get = await context.sheetsApi.spreadsheets.values.get({
    spreadsheetId: context.spreadsheetId,
    range: `${TEST_SHEETS.Sheet1.title}!A4:D4`,
    valueRenderOption: "FORMATTED_VALUE",
  })
  expect(resp_get.data.values?.[0]).toEqual(["Binh", "Salt"])
  expect(resp_get.data.values?.[0]).not.toEqual(["Binh", "Salt", undefined])
})

// Binary search w/ exponential increase to find the max row count
test.todo(`sheets_v4 - max row count in ranges is ${MAX_ROW_COUNT}`)
