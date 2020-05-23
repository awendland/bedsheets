# \[WIP\] Bedsheets

## FAQ

### I'm getting a 403 error when trying to access my sheet

There are several trouble-shooting steps to work through:

1. Is the Service Account added as an Editor to the Google Sheet?
2. Is the `spreadsheetId` pointing to the correct sheet? Check by replacing `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` with the `spreadsheetId` that you're providing to Bedsheets and make sure that the correct Google Sheet is appearing.
3. Does the Service Account have the `Service Account User` role?

### How much data can I fit in a Google Sheet?

According to [GSuiteTips](https://gsuitetips.com/tips/sheets/google-spreadsheet-limitations/) and [SpreadSheetPoint](https://spreadsheetpoint.com/google-sheets-limitations/), Google Sheets supports a maximum of 5 million cells per spreadsheet, up to 200 tabs, and up to 18,278 columns. A default Sheet will have 26 columns while most use cases only need <10, so it might be possible to extend the number of rows you can have by deleting any empty columns (# rows = # max cells / # columns). I haven't tested these limits yet (TODO test these limits!). Apparently, an update can only add 40,000 new rows at a time as well.
