# \[WIP\] Bedsheets

## Comparison to Traditional DBs

### Terminology

| Bedsheets      | Postgres                                                                                  | Description                        |
| -------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| Spreadsheet ID | [Database Name / dbname](https://www.postgresql.org/docs/9.2/libpq-connect.html#AEN38680) | The instance/server being accessed |
| Sheet          | Table                                                                                     | The model/entity being retrieved   |

## FAQ

### What's a _Spreadsheet ID_ or _A1 Notation_?

See Google's [Sheet API Concepts](https://developers.google.com/sheets/api/guides/concepts) for an overview of these Google Sheets (and, in the case of _A1 Notation_, general spreadsheet) concepts.

### How are dates stored in Google Sheets?

See Google's [Sheet API Concepts: Date & Time](https://developers.google.com/sheets/api/guides/concepts#datetime_serial_numbers) section for an overview of how spreadsheets store date & time.

### I'm getting a 403 error when trying to access my sheet

There are several trouble-shooting steps to work through:

1. Is the Service Account added as an Editor to the Google Sheet?
2. Is the `spreadsheetId` pointing to the correct sheet? Check by replacing `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` with the `spreadsheetId` that you're providing to Bedsheets and make sure that the correct Google Sheet is appearing.
3. Does the Service Account have the `Service Account User` role?

### How much data can I fit in a Google Sheet?

According to [GSuiteTips](https://gsuitetips.com/tips/sheets/google-spreadsheet-limitations/) and [SpreadSheetPoint](https://spreadsheetpoint.com/google-sheets-limitations/), Google Sheets supports a maximum of 5 million cells per spreadsheet, up to 200 tabs, and up to 18,278 columns. A default Sheet will have 26 columns while most use cases only need <10, so it might be possible to extend the number of rows you can have by deleting any empty columns (# rows = # max cells / # columns). I haven't tested these limits yet (TODO test these limits!). Apparently, an update can only add 40,000 new rows at a time as well.

## Contributing

### Project Structure

This project uses `lerna` with `yarn workspaces` to manage a variety of packages. To kick things off, run `yarn` in the repo root. To build all packages, run `yarn build:all`. To execute all tests, run `yarn test:all`.

#### Intraproject Package Dependencies

Yarn Workspaces enables packages to depend directly on each other. These packages still need to be compiled before they can be used though, since they are still consumed through `node_modules` with each `package.json` defining how they should be imported (i.e. consuming them intra-project is the same as an end-user consuming them from the npm registry).

#### Dependency Management

Any dependency that isn't needed for end-user package functionality (such as testing, compilation, or other developer niceties) should be installed as a _dev dependency_ (`yarn add -D package_name`).

Each package should declare all packages that it needs, it should not rely on their ambient availability from the root `package.json`. If a _dev dependency_ is being used by multiple packages, it should be installed via the root `package.json` (using `yarn add -D package_name -W`) and the packages that require it should specify the version as `*` (e.g. see the `typescript` declaration under `devDependencies` in each `packages/*/package.json`).

#### Tests

Tests should be stored under a `tests` folder in each package's folder (e.g. `./packages/google-sheets-dal/tests/`). Tests should be further subdivided into `unit` and `integration`, where _unit tests_ do NOT interact with the internet or other services on the host, and _integration tests_ do rely on external services. Tests should be written in Typescript, and will be run using `jest` and `ts-jest`.

#### Environment Compatibility

##### Node

To ensure that these packages can run across all targeted Node versions `@types/node` should be set to the oldest supported version.

Furthermore, CI should run against this oldest supported version (with the assumption that Node had no breaking changes since).

##### Typescript

TODO figure out how to test files against older Typescript versions to ensure that they use syntax that isn't too new.
