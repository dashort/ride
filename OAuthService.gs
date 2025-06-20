/**
 * @fileoverview
 * OAuth utility functions for the Motorcycle Escort Management System.
 */

/**
 * Returns an OAuth access token for the current script.
 *
 * Include this token in the `Authorization` header as a Bearer token
 * when using `UrlFetchApp.fetch` to call Google APIs.
 *
 * Example:
 * const headers = { 'Authorization': 'Bearer ' + getOAuthToken() };
 * const response = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files', {
 *   'headers': headers
 * });
 *
 * @return {string} OAuth token string.
 */
function getOAuthToken() {
  return ScriptApp.getOAuthToken();
}

