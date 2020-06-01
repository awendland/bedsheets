import request from "supertest"
import { promisify } from "util"
import { GoogleSheetsIntegration } from "@bedsheets/test-helpers"
import { runServer } from "../../src/server"
import { utils } from "@bedsheets/google-sheets-dal"
import * as Log from "../../src/simple-logger"
import { Server } from "http"

const TEST_SHEETS = {
  Sheet1: {
    id: 1,
    title: "Sheet1",
    values: [
      ["name", "favorite_food", "age"],
      ["Catherine", "In-n-out", "23"],
      ["Chris", "Chick-fil-a", "20"],
      ["Daniel", "Wafu", "16"],
    ],
  },
  Sheet_2: {
    id: 2,
    title: "Sheet 2",
    values: [
      ["name", "favorite_food", "age"],
      ["Catherine", "In-n-out", "23"],
    ],
  },
  Sheet3: {
    id: 3,
    title: "Sheet3",
    values: [
      ["name", "favorite_food", "favorite_food"],
      ["Catherine", "In-n-out", "23"],
    ],
  },
}

const maxRequestSize = 10 * 2 ** 10 // 10 KiB

const context = {
  ...GoogleSheetsIntegration.NewContext(),
  server: null as Server | null,
}

beforeAll(async () => await GoogleSheetsIntegration.setupAPI(context))
beforeEach(async () => {
  await GoogleSheetsIntegration.setupSpreadsheet(context, TEST_SHEETS)
  if (!process.env.LOG_LEVEL) Log.setLevel(Log.LogLevel.ERROR)
  context.server = await runServer({
    port: null,
    maxRequestSize,
  })
})
afterEach(async () => {
  if (context.server) await promisify(context.server.close)
  await GoogleSheetsIntegration.teardownSpreadsheet(context, TEST_SHEETS)
})

///////////////////
// Standard Case //
///////////////////

test("generic REST server - GET /Sheet1/describe", async () => {
  await request(context.server)
    .get(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}/describe`)
    .expect(200, { headers: TEST_SHEETS.Sheet1.values[0] })
})

test("generic REST server - GET /Sheet%202/describe (space in sheet name)", async () => {
  await request(context.server)
    .get(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet_2.title}/describe`)
    .expect(200, { headers: TEST_SHEETS.Sheet_2.values[0] })
})

test("generic REST server - GET /Sheet1, 3 objects", async () => {
  await request(context.server)
    .get(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}`)
    .expect(200, {
      data: utils.objectsFromRowMajor2D(
        TEST_SHEETS.Sheet1.values[0],
        TEST_SHEETS.Sheet1.values.slice(1)
      ),
    })
})

test("generic REST server - GET /Sheet1, 1 object w/ offset + limit", async () => {
  await request(context.server)
    .get(
      `/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}?offset=1&limit=1`
    )
    .expect(200, {
      data: utils.objectsFromRowMajor2D(
        TEST_SHEETS.Sheet1.values[0],
        TEST_SHEETS.Sheet1.values.slice(2, 3)
      ),
    })
})

{
  const postData = [
    {
      name: "Teddy",
      favorite_food: "Red spice chicken",
      age: "24",
    },
    {
      name: "Margaret",
      favorite_food: "Vanilla yogurt",
      age: "4",
    },
  ]

  test("generic REST server - POST /Sheet1, 2 objects", async () => {
    await request(context.server)
      .post(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}`)
      .send(postData)
      .expect(200, {
        updatedRange: `${TEST_SHEETS.Sheet1.title}!A5:C6`,
        updatedRowCount: 2,
      })
  })

  test("generic REST server - POST /Sheet3, 2 objects to misconfigured sheet, not strict", async () => {
    await request(context.server)
      .post(
        `/${context.spreadsheetId}/${TEST_SHEETS.Sheet3.title}?strict=false`
      )
      .send(postData)
      .expect(200, {
        updatedRange: `${TEST_SHEETS.Sheet3.title}!A3:C4`,
        updatedRowCount: 2,
      })
    await request(context.server)
      .get(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet3.title}`)
      .expect(200, {
        data: [
          { name: "Catherine", favorite_food: "23" },
          { name: "Teddy", favorite_food: "Red spice chicken" },
          { name: "Margaret", favorite_food: "Vanilla yogurt" },
        ],
      })
  })
}

////////////
// Errors //
////////////

test("generic REST server - error - GET /bad/Sheet1, bad spreadsheetId", async () => {
  await request(context.server)
    .get(`/NotASpreadsheetId/${TEST_SHEETS.Sheet1.title}`)
    .expect(404, {
      message: "Requested entity was not found.",
      spreadsheetId: "NotASpreadsheetId",
    })
})

test("generic REST server - error - GET /good/NotASheet, bad sheet name", async () => {
  await request(context.server)
    .get(`/${context.spreadsheetId}/NotASheet`)
    .expect(404, {
      message: "Unable to parse range: 'NotASheet'!1:1",
      sheet: "NotASheet",
    })
})

test("generic REST server - error - HEAD /Sheet1, not a method", async () => {
  await request(context.server)
    .head(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}`)
    .expect(405, {})
})

test("generic REST server - error - GET /Sheet1/schema, not a virtual resource", async () => {
  await request(context.server)
    .get(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}/fakevirtualres`)
    .expect(405)
})

test("generic REST server - error - GET /Sheet1, bad offset param", async () => {
  await request(context.server)
    .get(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}?offset=racecar`)
    .expect(400)
})

test("generic REST server - error - POST /Sheet1, malformed payload", async () => {
  const postData = [{ hair_color: "red" }]
  await request(context.server)
    .post(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}`)
    .send(postData)
    .expect(400, {
      sheet: TEST_SHEETS.Sheet1.title,
      malformedEntries: [
        {
          fields: {
            missing: ["name", "favorite_food", "age"],
            extra: ["hair_color"],
          },
          value: postData[0],
          index: 0,
        },
      ],
    })
})

test("generic REST server - error - POST /Sheet1, payload too big", async () => {
  await request(context.server)
    .get(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet1.title}/fakevirtualres`)
    .send([
      {
        name: "James",
        age: "6",
        favorite_food: "Sushi".repeat(maxRequestSize),
      },
    ])
    .expect(413, {})
})

test("generic REST server - error - POST /Sheet3, misconfigured sheet", async () => {
  await request(context.server)
    .post(`/${context.spreadsheetId}/${TEST_SHEETS.Sheet3.title}`)
    .send([{ name: "Ming", favorite_food: "Yamato", age: "21" }])
    .expect(502, {
      reason: "DUPLICATE_HEADERS",
      sheet: "Sheet3",
    })
})
