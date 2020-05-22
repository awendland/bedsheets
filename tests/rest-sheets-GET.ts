import anyTest, {TestInterface} from 'ava';

import * as RESTSheets from '../src/playground';
import { sheets_v4, google } from 'googleapis';

// https://developers.google.com/sheets/api/limits
// As of 2020-02-21: 100 requests per 100 seconds
const RATE_LIMIT_DELAY_MS = 2000 // Assume each test makes two requests

const test = anyTest as TestInterface<{
  sheetsApi: sheets_v4.Sheets
  spreadsheetId: string
}>

test.before(async t => {
  // Loads credentials from path specified in GOOGLE_APPLICATION_CREDENTIALS env var
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const authClient = await auth.getClient();
  t.context.sheetsApi = google.sheets({version: 'v4', auth: authClient});

  t.context.spreadsheetId = process.env.TEST_SPREADSHEET_ID
    ?? (() => { throw new Error(`Missing TEST_SPREADSHEET_ID`) })()

  // Ensure that the spreadsheet is accessible (this will throw a 403 if it's not)
  await t.context.sheetsApi.spreadsheets.get({
    spreadsheetId: t.context.spreadsheetId,
  })
})

const TEST_SHEETS = {
  Sheet1: {id: 1},
  Sheet2: {id: 2},
  Sheet3: {id: 3},
}

test.beforeEach(async t => {
  const addSheets = () =>
    t.context.sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: t.context.spreadsheetId,
      requestBody: { requests: Object.entries(TEST_SHEETS).map(([k, p]) => ({ addSheet: { properties: { sheetId: p.id, title: k } } })) }
    })
  try {
    await addSheets()
  } catch (e) {
    // The cleanup operation must have failed. Therefore, cleanup any outstanding
    // sheets and add each new sheet one by one.
    for (const [, {id: sheetId}] of Object.entries(TEST_SHEETS)) {
      try {
        // Try deleting any old sheet that's hanging around and blocking the add operation
        t.context.sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId: t.context.spreadsheetId,
          requestBody: { requests: [ { deleteSheet: { sheetId } } ] }
        })
      } catch (e) {}
    }
    await addSheets()
  }
})

test.afterEach(async t => {
  const deleteSheets = Object.entries(TEST_SHEETS).map(([k, p]) => ({ deleteSheet: { sheetId: p.id, } }))
  await t.context.sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: t.context.spreadsheetId,
    requestBody: { requests: [ ...deleteSheets ] }
  })

  await new Promise(res => setTimeout(res, RATE_LIMIT_DELAY_MS))
})


test('get', async t => {
})
