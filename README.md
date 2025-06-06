# Motorcycle Escort Management

This project is a Google Apps Script application for managing motorcycle escort operations.  It includes server‑side `.gs` scripts, several HTML pages and a navigation template used to build a web UI.  Functionality spans rider and request management, assignment scheduling, dashboards and notification features.

## Main Features

- **Dashboard & Pages** – HTML files such as `index.html`, `requests.html`, `assignments.html`, `riders.html`, `notifications.html` and `reports.html` provide pages for the web interface.  Each page contains a `<!--NAVIGATION_MENU_PLACEHOLDER-->` that is replaced by dynamic navigation generated in `Code.gs`.
- **Request and Rider CRUD** – `RequestCRUD.gs` and `RiderCRUD.gs` implement create/read/update/delete operations for escort requests and rider records.
- **Assignments and App Services** – `AppServices.gs` consolidates data and helps prepare views like upcoming assignments or active riders.
- **Twilio Integration** – `NotificationService.gs` and configuration in `Code.gs` enable sending SMS notifications via Twilio.  Twilio credentials are pulled from Apps Script properties.

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Install any dependencies:

   ```bash
   npm install
   ```

   The project currently has no additional packages so this step simply creates a `package-lock.json` if needed.

3. Run the test script (none are implemented yet):

   ```bash
   npm test
   ```

   The default script prints an error until real tests are added.

## Deployment with Apps Script

This repository uses **clasp** for deployment.  `.clasp.json` specifies the Apps Script `scriptId` and file extensions.

1. Install clasp globally:

   ```bash
   npm install -g @google/clasp
   ```

2. Authenticate:

   ```bash
   clasp login
   ```

3. Push local files to Apps Script:

   ```bash
   clasp push
   ```

4. Deploy as a web app from the Apps Script UI or via:

   ```bash
   clasp deploy --webapp
   ```

   This creates a version and produces a URL that can be shared.

## Environment Variables

Twilio credentials must be configured as script properties inside your Apps Script project.  Set the following keys under **Project Settings → Script Properties** or by using `PropertiesService`:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

These values are read in `Code.gs` when constructing the `CONFIG.twilio` object:

```javascript
const CONFIG = {
  // Twilio SMS Configuration
  twilio: {
    accountSid: PropertiesService.getScriptProperties().getProperty('TWILIO_ACCOUNT_SID'),
    authToken: PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH_TOKEN'),
    fromNumber: PropertiesService.getScriptProperties().getProperty('TWILIO_FROM_NUMBER'),
    // Optional settings
    enableDeliveryCallbacks: true,
    maxRetries: 3,
    retryDelay: 1000
  },
  // ...
};
```

Make sure these properties are defined so SMS notifications work properly.
