/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT WEB APP BRIDGE FOR SEMESTER MARKS ANALYTICS PLATFORM
 * ==============================================================================
 * 
 * Instructions for Lecturer / Spreadsheet Owner:
 * 1. Open your Google Spreadsheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace any default code with the script below.
 * 4. (Optional) Set a SECRET_TOKEN below to secure your endpoint.
 * 5. Click "Deploy" > "New deployment".
 * 6. Select Type: "Web app".
 * 7. Set:
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (the secret token protects access)
 * 8. Click "Deploy", authorize access, and copy the Web App URL.
 * 9. Paste the Web App URL (and secret token if used) into the Platform Connection Settings.
 */

const SECRET_TOKEN = "COLLEGE_MARKS_SECURE_TOKEN_2026"; // Change to your desired secret or leave empty

function doGet(e) {
  // Check token security if configured
  if (SECRET_TOKEN && SECRET_TOKEN.length > 0) {
    const providedToken = (e && e.parameter && e.parameter.token) || "";
    if (providedToken !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({
        error: "Unauthorized: Invalid or missing access token"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet;
    
    // Check if a specific sheet name or gid was requested
    if (e && e.parameter && e.parameter.sheet) {
      sheet = ss.getSheetByName(e.parameter.sheet);
    } else if (e && e.parameter && e.parameter.gid) {
      const sheets = ss.getSheets();
      sheet = sheets.find(s => s.getSheetId().toString() === e.parameter.gid);
    }

    if (!sheet) {
      // Default to the first sheet or a sheet named 'Marks' / 'Semester Marks' if present
      const sheets = ss.getSheets();
      sheet = sheets.find(s => s.getName().toLowerCase().includes('mark')) || sheets[0];
    }

    const data = sheet.getDataRange().getValues();
    if (!data || data.length === 0) {
      return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
    }

    // Convert 2D array to CSV
    const csvRows = data.map(row => {
      return row.map(cell => {
        let str = cell === null || cell === undefined ? "" : cell.toString();
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(",");
    });

    const csvContent = csvRows.join("\r\n");

    return ContentService.createTextOutput(csvContent)
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: err.message || "Failed to read spreadsheet data"
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

