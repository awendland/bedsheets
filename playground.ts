import { google } from "googleapis"
import * as SheetsDAL from "./google-sheets-model"
;(async () => {
  console.time("auth")
  // Step 1. Setup an account according to these instructions:
  // https://medium.com/@williamchislett/writing-to-google-sheets-api-using-net-and-a-services-account-91ee7e4a291
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    // Use GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account credentials file
    // or pass values directly:
    // private_key: from credentials.json
    // client_email: from credentials.json
  })
  const authClient = await auth.getClient()
  console.timeEnd("auth")

  console.time("sheets init")
  const sheets = google.sheets({ version: "v4", auth: authClient })
  console.timeEnd("sheets init")

  console.time("sheets request")
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: "1a5a11VmXOwK1txujW-BXoj23M761KpWVZZOQoiTyKU8",
    range: `Playground!A3:D4`,
  })
  console.timeEnd("sheets request")
  console.dir(resp, { depth: 5 })
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
