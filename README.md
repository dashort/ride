# Ride Apps Script Web App

This repository contains a Google Apps Script project used to manage ride scheduling.

## Prerequisites

1. Create a new Apps Script project in Google Drive.
2. Enable the **Gmail** advanced service.
   - From the Apps Script editor click **Services** > **+** and enable *Gmail API*.
   - In the linked Google Cloud project also enable the *Gmail API*.
3. Copy all `.gs` and `.html` files from this repo into your project along with the `appsscript.json`.
4. In `appsscript.json` add `https://api.twilio.com/` to the `urlFetchWhitelist` section so the script can call the Twilio API.
5. In the Apps Script editor open **Project Settings** and add the following **Script properties** so the Twilio features work:
   - `TWILIO_ACCOUNT_SID` – your Twilio account SID
   - `TWILIO_AUTH_TOKEN` – your Twilio auth token
   - `TWILIO_FROM_NUMBER` – the Twilio phone number used to send SMS

## OAuth scopes

The `appsscript.json` file defines the following OAuth scopes:

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/script.webapp.deploy`

The `userinfo.email` and `userinfo.profile` scopes allow the script to read the user's basic profile and email address for authentication and personalization.

## Deploying the web app

1. In the Apps Script editor choose **Deploy** > **New deployment**.
2. Select **Web app** as the deployment type.
3. Set **Execute as** to **User deploying**.
4. Set **Who has access** to **Anyone**.
5. Click **Deploy**.

On first use, each user will be shown Google's OAuth consent screen asking to approve the above scopes. They must grant access for the web app to function correctly.
## Authentication

This project supports two sign‑in methods:

1. **Google Sign‑in** – users authenticate with their Google account. The
   built‑in functions automatically create a session based on the current Google
   user.
2. **Spreadsheet Credentials** – maintain a `Users` sheet in the spreadsheet
   with columns `email`, `hashedPassword`, `role`, `status` and `name`.  Users on
   this sheet can log in with their email and password via the login page.

Passwords in the sheet must be stored as a SHA‑256 hash.  Run the
`hashPassword("yourPassword")` function inside Apps Script to generate the value
for a new user.

Access the login form by opening the web app URL with `?action=login`.  Users who
are not signed in or authorized will automatically be redirected to this form.
Their name and role appear in the top‑right corner of each page once signed in.


## Email Responses Sheet

Incoming rider email replies are stored in a sheet named `Email_Responses`. If this sheet does not yet exist in your spreadsheet, run the Apps Script function `setupEmailResponsesSheet()` once to create it. The sheet will be initialized with the columns:

```
Timestamp | From Email | Rider Name | Message Body | Request ID | Action
```

After running the setup function, automated email processing will log each response to this sheet and append the raw message text to the rider's assignment notes. The request ID is extracted from the email subject line (e.g. `Assignment 123 - A-01-24`) and stored for reference.

## Email Response Integration

### Automatic Request Updates

When riders respond to notification requests via email or confirmation links, their responses are now automatically added to the relevant request's notes. This provides a complete audit trail of rider responses directly in the request record.

#### How It Works

1. **Response Logging**: All rider responses (email replies and link clicks) are logged in the `Email_Responses` sheet with columns:
   - Column A: Timestamp when they responded
   - Column C: Rider name  
   - Column E: Request ID
   - Column F: Response action (Confirm or Decline)

2. **Automatic Updates**: When a response is logged, the system automatically:
   - Finds the corresponding request using the Request ID
   - Formats the response as: `"Joe Smith confirmed at 7-25-25 1441 hrs"`
   - Adds this information to the request's Notes field
   - Prevents duplicate entries for the same response

3. **Manual Updates**: You can also manually update all requests with response information using:
   - **Menu**: 🏍️ Escort Management → 📧 Email Response Tracking → 📝 Update Requests with Responses
   - **Function**: `updateRequestsWithResponseInfo()`

#### Response Format

Response information is added to request notes in this format:
```
Joe Smith confirmed at 7-25-25 1441 hrs
Jane Doe declined at 7-25-25 1445 hrs
```

Where:
- **Name**: The rider who responded
- **Action**: "confirmed" or "declined" 
- **Date/Time**: MM-dd-yy HHmm format in system timezone

#### Testing and Verification

Test the functionality with these functions:
- `testRequestResponseUpdate()` - Tests the update mechanism
- `verifyRequestResponseUpdates()` - Verifies that requests contain response info
- `verifyRequestResponseUpdates('REQUEST-ID')` - Check a specific request

#### Manual Processing

If you need to process responses that weren't automatically updated:

1. Go to **🏍️ Escort Management** → **📧 Email Response Tracking** → **📝 Update Requests with Responses**
2. Or run `updateRequestsWithResponseInfo()` in the script editor
3. The function will process all responses in the Email_Responses sheet and update corresponding requests

This ensures that request managers have complete visibility into rider responses directly within the request record, eliminating the need to cross-reference multiple sheets.

