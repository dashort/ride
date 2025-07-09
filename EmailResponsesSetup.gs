/**
 * Ensure the Email_Responses sheet exists with the correct headers.
 * Run this once to create the sheet manually if needed.
 */
function setupEmailResponsesSheet() {
  getOrCreateSheet('Email_Responses', [
    'Timestamp',
    'From Email',
    'Rider Name',
    'Message Body',
    'Action'
  ]);
}