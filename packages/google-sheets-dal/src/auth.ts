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
  | {
      GOOGLE_AUTH_KEYFILE: string
    }
  | {
      GOOGLE_AUTH_KEYFILE_BASE64: string
    }

class GoogleAuthInvalidKeyfile extends Error {}

/**
 * Retrieve a Google Auth CredentialBody from values provided in environment
 * variables, or return an empty object if they aren't present.
 *
 * This will attempt to be user friendly in the following ways:
 * 1. Decode newline characters left as '\n' in the private_key string due to JSON encoding.
 * 2. Remove extraneous newlines from input intended to be base64 before decoding
 */
export function getCredentialsFromEnvVars(
  envVars: { [k: string]: string | undefined } = process.env
): { credentials: CredentialBody } | {} {
  let { GOOGLE_AUTH_CLIENT_EMAIL, GOOGLE_AUTH_PRIVATE_KEY } = envVars
  if (GOOGLE_AUTH_CLIENT_EMAIL && GOOGLE_AUTH_PRIVATE_KEY) {
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

  let { GOOGLE_AUTH_KEYFILE } = envVars
  if (GOOGLE_AUTH_KEYFILE) {
    try {
      const { client_email, private_key } = JSON.parse(GOOGLE_AUTH_KEYFILE)
      return { credentials: { client_email, private_key } }
    } catch (e) {
      throw new GoogleAuthInvalidKeyfile(
        `The credentials JSON blob provided in GOOGLE_AUTH_KEYFILE was invalid: ${e.message}`
      )
    }
  }

  let { GOOGLE_AUTH_KEYFILE_BASE64 } = envVars
  if (GOOGLE_AUTH_KEYFILE_BASE64) {
    try {
      // Merge any newlines in the base 64 which may have been inserted
      // if openssl's base64 encoding command was used.
      GOOGLE_AUTH_KEYFILE_BASE64 = GOOGLE_AUTH_KEYFILE_BASE64.replace(/\n/g, "")
      const decoded = Buffer.from(
        GOOGLE_AUTH_KEYFILE_BASE64,
        "base64"
      ).toString("utf8")
      const { client_email, private_key } = JSON.parse(decoded)
      return { credentials: { client_email, private_key } }
    } catch (e) {
      throw new GoogleAuthInvalidKeyfile(
        `The credentials JSON blob encoded as base 64 in GOOGLE_AUTH_KEYFILE_BASE64 was invalid: ${e.message}`
      )
    }
  }

  return {}
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
