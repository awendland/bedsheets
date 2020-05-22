## FAQ

### I'm getting a 403 error when trying to access my sheet

There are several trouble-shooting steps to work through:

1. Is the Service Account added as an Editor to the Google Sheet?
2. Is the `spreadsheetId` pointing to the correct sheet? Check by replacing `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` with the `spreadsheetId` that you're providing to Bedsheets and make sure that the correct Google Sheet is appearing.
3. Does the Service Account have the `Service Account User` role?
