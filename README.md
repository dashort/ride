# Ride Apps Script Web App

This repository contains a Google Apps Script project used to manage ride scheduling.

## Prerequisites

1. Create a new Apps Script project in Google Drive.
2. Enable the **Gmail** advanced service.
   - From the Apps Script editor click **Services** > **+** and enable *Gmail API*.
   - In the linked Google Cloud project also enable the *Gmail API*.
3. Copy all `.gs` and `.html` files from this repo into your project along with the `appsscript.json`.

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

## Response tracking

The app logs rider replies to two auxiliary sheets:

- `SMS_Responses`
- `Email_Responses`

Both sheets will be created automatically if they do not exist. The `Assignments` sheet should also include a `Notes` column so that rider responses can be appended to the relevant assignment.
