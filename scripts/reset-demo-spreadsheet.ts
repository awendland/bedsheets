#!/usr/bin/env ts-node-script
import { sheets_v4 } from "googleapis"
import * as auth from "../packages/google-sheets-dal/src/auth"

type SeedSheet = {
  id: number
  title: string
  values: Array<Array<string | undefined>>
}

export const clearSpreadsheet = async (
  sheetsApi: sheets_v4.Sheets,
  spreadsheetId: string
) => {
  // Clear out any existing sheets
  const spreadsheet = await sheetsApi.spreadsheets.get({ spreadsheetId })
  const deleteRequests = (spreadsheet.data.sheets ?? []).reduce(
    (requests, sheet) => {
      // Skip the sheet if it has a protected range.
      //
      // This solves the problem arising from not being able to delete every sheet in a
      // spreadsheet. So which sheet do we pick not to delete? With this approach the
      // burden is placed on the spreadsheet's maintainer to designate a sheet
      // to not be deleted by protecting it.
      if ((sheet.protectedRanges ?? []).length > 0) return requests
      const sheetId = sheet.properties?.sheetId
      if (sheetId || sheetId === 0) {
        requests.push({ deleteSheet: { sheetId } })
        console.log(`  Deleting sheet ${sheetId}`)
      }
      return requests
    },
    [] as sheets_v4.Schema$Request[]
  )
  if (deleteRequests.length > 0)
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: { requests: deleteRequests },
    })
}

export const seedBlankSpreadsheet = async (
  sheetsApi: sheets_v4.Sheets,
  spreadsheetId: string,
  seedSheets: SeedSheet[]
) => {
  console.log(`  Adding ${seedSheets.length} sheets`)
  // Add new sheets
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: {
      requests: seedSheets.map((p) => ({
        addSheet: { properties: { sheetId: p.id, title: p.title } },
      })),
    },
  })

  // Populate sheets with starter data
  await sheetsApi.spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: seedSheets.map((p) => ({
        range: p.title,
        values: p.values,
      })),
    },
  })
}

if (require.main === module) {
  ;(async () => {
    if (process.argv.length <= 2)
      throw new Error(
        `` +
          `No spreadsheet IDs were provided.` +
          ` Invoke this command like "${process.argv[1]} SPREADSHEET_ID_1 SPREADSHEET_ID_2"`
      )
    const sheetsApi = await auth.getSheetsClient(process.env as any)
    for (const spreadsheetId of process.argv.slice(2)) {
      console.log(`Spreadsheet ${spreadsheetId}`)
      await clearSpreadsheet(sheetsApi, spreadsheetId)
      await seedBlankSpreadsheet(sheetsApi, spreadsheetId, [
        {
          id: 0xbadf00d + 1,
          title: "Playground",
          values: [
            ["name", "favorite_food", "age"],
            ["Ralph Wiley", "Sweetgreen", "52"],
          ],
        },
      ])
    }
  })().catch((e) => {
    console.log(e)
    process.exit(1)
  })
}
