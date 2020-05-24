import { TestInterface, Implementation } from "ava"
import { sheets_v4, google } from "googleapis"
import { FormattedSheetRow } from "../../../src/rest-sheets"

// https://developers.google.com/sheets/api/limits
// As of 2020-02-21: 100 requests per 100 seconds
export const RATE_LIMIT_DELAY_MS =
  Number.parseInt(process.env.RATE_LIMIT_DELAY_MS ?? "250") || 250

/**
 * Data template representing how a sheet should be seeded
 */
type SeedSheet = {
  id: number
  title: string
  values: FormattedSheetRow[]
}

/**
 * Run standard setup operations for integration tests
 * @param test
 * @param options
 * @param options.seedSheets These sheets will be seeded before each test
 * @param options.before If provided, will be executed after setting up the test context
 * @param options.beforeEach If provided, will be executed before each test, after sheets have been seeded
 * @param options.afterEach If provided, will be executed after each test, before seeded sheets have been deleted
 */
export function setupIntegrationTest<
  OriginalContext,
  NewContext extends OriginalContext & {
    sheetsApi: sheets_v4.Sheets
    spreadsheetId: string
  }
>(
  test: TestInterface<OriginalContext>,
  {
    seedSheets,
    before,
    beforeEach,
    afterEach,
  }: {
    seedSheets?: { [k: string]: SeedSheet }
    before?: Implementation<NewContext>
    beforeEach?: Implementation<NewContext>
    afterEach?: Implementation<NewContext>
  } = {}
) {
  const _test = test as TestInterface<NewContext>

  _test.before(async (t) => {
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

    if (before) await before(t)
  })

  _test.beforeEach(async (t) => {
    if (seedSheets) {
      const addSheets = () =>
        t.context.sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId: t.context.spreadsheetId,
          requestBody: {
            requests: Object.entries(seedSheets).map(([, p]) => ({
              addSheet: { properties: { sheetId: p.id, title: p.title } },
            })),
          },
        })
      try {
        await addSheets()
      } catch (e) {
        // The cleanup operation must have failed. Therefore, cleanup any outstanding
        // sheets and add each new sheet one by one.
        for (const [, { id: sheetId }] of Object.entries(seedSheets)) {
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
          data: Object.values(seedSheets).map((p) => ({
            range: p.title,
            values: p.values,
          })),
        },
      })
    }

    if (beforeEach) await beforeEach(t)
  })

  _test.afterEach.always(async (t) => {
    if (afterEach) await afterEach(t)

    if (seedSheets) {
      await t.context.sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId: t.context.spreadsheetId,
        requestBody: {
          requests: Object.entries(seedSheets).map(([k, p]) => ({
            deleteSheet: { sheetId: p.id },
          })),
        },
      })
    }

    await new Promise((res) => setTimeout(res, RATE_LIMIT_DELAY_MS))
  })

  return _test
}
