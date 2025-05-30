function showQuickAssignDialog() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActive();
    const dashSheet = ss.getSheetByName(CONFIG.sheets.dashboard);

    // Ensure the active sheet is the dashboard
    if (ss.getActiveSheet().getName() !== CONFIG.sheets.dashboard) {
      ui.alert('Error', 'Please navigate to the Dashboard sheet to use this function.', ui.ButtonSet.OK);
      return;
    }

    const activeRange = ss.getActiveRange();
    if (!activeRange) {
      ui.alert('Error', 'Please select a cell containing a Request ID on the dashboard.', ui.ButtonSet.OK);
      return;
    }

    const selectedRow = activeRange.getRow();
    const selectedCol = activeRange.getColumn();

    // Check if the selected row is within the requests display area (starts from row 11)
    const requestsDisplayStartRow = CONFIG.dashboard.requestsDisplayStartRow;
    if (selectedRow < requestsDisplayStartRow) {
      ui.alert('Error', 'Please select a Request ID cell within the displayed requests (rows 11 or below).', ui.ButtonSet.OK);
      return;
    }

    // Check if the selected column is the Request ID column (Column A, which is 1)
    if (selectedCol !== 1) {
      ui.alert('Error', 'Please select a cell in the "Request ID" column (Column A) to assign riders.', ui.ButtonSet.OK);
      return;
    }

    // Get the Request ID from the selected cell
    const requestId = activeRange.getValue();

    // Changed \d{2} to \d{1,2} to allow for single-digit sequence numbers
    if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{1,2}-\d{2}$/)) {
      ui.alert('Error', `Invalid Request ID selected: "${requestId}". Please select a valid Request ID.`, ui.ButtonSet.OK);
      return;
    }

    // ===== IMPORTANT: REPLACE THIS WITH YOUR ACTUAL WEB APP DEPLOYMENT URL =====
    // If you don't have one yet, deploy your script as a Web App (Deploy -> New Deployment -> Web App)
    // Make sure "Execute as" is "Me" and "Who has access" is "Anyone".
    const WEB_APP_BASE_URL = "https://script.google.com/macros/s/AKfycbyGPHwTNYnqK59cdsI6NVv5O5aBlrzSnulpVu-WJ86-1rlkT3PqIf_FAWgrFpcNbMVU/exec"; // Example: "https://script.google.com/macros/s/AKfycbxyzabc123defg456hi/exec";
    
    // IMPORTANT: If you see a generic URL like "https://script.google.com/macros/s/AKfycbxyzabc123defg456hi/exec" you MUST
    // get your unique web app URL from Deploy -> Manage Deployments -> Your Web App Deployment -> Web app URL
    // Each deployment generates a unique URL.

    if (WEB_APP_BASE_URL === "https://script.google.com/macros/s/AKfycbyGPHwTNYnqK59cdsI6NVv5O5aBlrzSnulpVu-WJ86-1rlkT3PqIf_FAWgrFpcNbMVU/exec") {
        ui.alert('Configuration Error', 'Please deploy your script as a Web App and update WEB_APP_BASE_URL in the script with the actual URL from your deployment settings.', ui.ButtonSet.OK);
        return;
    }


    const webAppUrl = `${WEB_APP_BASE_URL}?requestId=${encodeURIComponent(requestId)}`;

    const htmlOutput = HtmlService.createHtmlOutput(`<script>window.open('${webAppUrl}', '_blank').focus(); google.script.host.close();</script>`)
      .setTitle('Opening Assignment Form')
      .setHeight(10)
      .setWidth(10);

    ui.showModalDialog(htmlOutput, 'Opening...');

    logActivity(`Opened assignment form for Request ID: ${requestId}`);

  } catch (error) {
    logError('Error assigning riders from dashboard', error);
    ui.alert('Error', 'Failed to open assignment form: ' + error.message, ui.ButtonSet.OK);
  }
}