import { sheets_v4, google } from "googleapis"

// https://developers.google.com/sheets/api/limits
// As of 2020-02-21: 100 requests per 100 seconds
export const RATE_LIMIT_DELAY_MS =
  Number.parseInt(process.env.RATE_LIMIT_DELAY_MS ?? "3000") || 3000

/**
 * Data template representing how a sheet should be seeded
 */
export type SeedSheet = {
  id: number
  title: string
  values: (string | undefined)[][]
}

export type MutableContext = {
  sheetsApi: sheets_v4.Sheets
  spreadsheetId: string
}

export type ReadonlyContext = Readonly<MutableContext>

export const NewContext = () => ({} as MutableContext)

/**
 * Setup a Google Sheets API entity and test that the provided Spreadsheet ID is valid.
 *
 * Populates the provided MutableContext.
 *
 * Loads credentials from either:
 * - GOOGLE_APPLICATION_CREDENTIALS which specifies a path to a credentials json file
 * OR
 * - GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY which specify the information directly
 */
export const setupAPI = async (
  mutableContext: MutableContext,
  {
    google_auth_client_email = process.env.GOOGLE_AUTH_CLIENT_EMAIL,
    google_auth_private_key = process.env.GOOGLE_AUTH_PRIVATE_KEY,
  }: {
    google_auth_client_email?: string
    google_auth_private_key?: string
  } = {}
) => {
  // TODO consider using the hanlder in google-sheets-dal/auth.ts to instantiate this
  mutableContext.sheetsApi = google.sheets({
    version: "v4",
    auth: await new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      ...(google_auth_client_email && google_auth_private_key
        ? {
            credentials: {
              client_email: google_auth_client_email,
              private_key: google_auth_private_key,
            },
          }
        : {}),
    }).getClient(),
  })

  mutableContext.spreadsheetId =
    process.env.TEST_SPREADSHEET_ID ??
    (() => {
      throw new Error(`Missing TEST_SPREADSHEET_ID`)
    })()

  // Ensure that the spreadsheet is accessible (this will throw a 403 if it's not)
  await mutableContext.sheetsApi.spreadsheets.get({
    spreadsheetId: mutableContext.spreadsheetId,
  })
}

/**
 * Populate the test spreadsheet with any provided seed data. If the spreadsheet has
 * data already present for those sheets, it will be removed first.
 */
export const setupSpreadsheet = async (
  context: ReadonlyContext,
  seedSheets: { [k: string]: SeedSheet }
) => {
  if (seedSheets) {
    const addSheets = () =>
      context.sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId: context.spreadsheetId,
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
          await context.sheetsApi.spreadsheets.batchUpdate({
            spreadsheetId: context.spreadsheetId,
            requestBody: { requests: [{ deleteSheet: { sheetId } }] },
          })
        } catch (e) {}
      }
      await addSheets()
    }

    // Populate sheets with starter data
    await context.sheetsApi.spreadsheets.values.batchUpdate({
      spreadsheetId: context.spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: Object.values(seedSheets).map((p) => ({
          range: p.title,
          values: p.values,
        })),
      },
    })
  }
}

/**
 * Remove any data that has been added to the test spreadsheet during execution.
 */
export const teardownSpreadsheet = async (
  context: ReadonlyContext,
  seedSheets: { [k: string]: SeedSheet }
) => {
  if (seedSheets) {
    await context.sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: context.spreadsheetId,
      requestBody: {
        requests: Object.entries(seedSheets).map(([k, p]) => ({
          deleteSheet: { sheetId: p.id },
        })),
      },
    })
  }

  await new Promise((res) => setTimeout(res, RATE_LIMIT_DELAY_MS))
}
