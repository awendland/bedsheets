import { CredentialBody } from "google-auth-library"
import { sheets_v4, google } from "googleapis"

type GoogleAuthEnvVars =
  | {
      GOOGLE_APPLICATION_CREDENTIALS: string
    }
  | {
      GOOGLE_AUTH_CLIENT_EMAIL: string
      GOOGLE_AUTH_PRIVATE_KEY: string
    }

/**
 * Retrieve a Google Auth CredentialBody from values provided in environment
 * variables, or return an empty object if they aren't present.
 *
 * This will attempt to be user friendly in the following ways:
 * 1. Decode newline characters left as '\n' in the string due to JSON encoding.
 */
export function getCredentialsFromEnvVars(
  envVars: { [k: string]: string | undefined } = process.env
): { credentials: CredentialBody } | {} {
  let { GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY } = envVars
  if (!GOOGLE_AUTH_CLIENT_EMAIL || !GOOGLE_AUTH_PRIVATE_KEY) return {}
  // Ensure that newlines are represented correctly, not in an encoded form
  // which people might due if they copy the values directly from the
  // credentials.json file (since JSON requires newlines to be escaped).
  GOOGLE_AUTH_PRIVATE_KEY = GOOGLE_AUTH_PRIVATE_KEY.replace(/\\n/g, "\n")
  // TODO what other helpful errors can be thrown here?
  return {
    credentials: {
      client_email: GOOGLE_AUTH_CLIENT_EMAIL,
      private_key: GOOGLE_AUTH_PRIVATE_KEY,
    },
  }
}

/**
 * Retrieve a Google Sheets API client that's been instantiated from a
 * Google Auth client that has appropriate scope and the correct authentication
 * credentials (either taken from a credentials file or directly from env
 * vars).
 */
export async function getSheetsClient(
  envVars: GoogleAuthEnvVars
): Promise<sheets_v4.Sheets> {
  return google.sheets({
    version: "v4",
    auth: await new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      ...getCredentialsFromEnvVars(envVars),
    }).getClient(),
  })
}
