export interface ParsedSheetUrl {
  isValid: boolean;
  spreadsheetId?: string;
  gid?: string;
  exportUrl?: string;
  error?: string;
}

export function parseGoogleSheetsUrl(inputUrl: string): ParsedSheetUrl {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, error: 'URL must not be empty.' };
  }

  const trimmed = inputUrl.trim();

  // Validate host to prevent SSRF
  try {
    const parsed = new URL(trimmed);
    const validHosts = ['docs.google.com', 'drive.google.com'];
    if (!validHosts.includes(parsed.hostname.toLowerCase())) {
      return {
        isValid: false,
        error: 'Security violation: Outbound requests are strictly restricted to docs.google.com.'
      };
    }

    // Extract spreadsheet ID: /spreadsheets/d/([a-zA-Z0-9-_]+)
    const match = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return {
        isValid: false,
        error: 'Invalid Google Sheets URL format. Could not locate spreadsheet ID.'
      };
    }

    const spreadsheetId = match[1];

    // Extract gid from search params or hash
    let gid: string | undefined;
    if (parsed.searchParams.has('gid')) {
      gid = parsed.searchParams.get('gid') || undefined;
    } else if (parsed.hash) {
      const hashMatch = parsed.hash.match(/gid=([0-9]+)/);
      if (hashMatch && hashMatch[1]) {
        gid = hashMatch[1];
      }
    }

    // Construct export URL
    let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    if (gid) {
      exportUrl += `&gid=${gid}`;
    }

    return {
      isValid: true,
      spreadsheetId,
      gid,
      exportUrl
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Malformed URL: ${err.message || 'Unable to parse URL'}`
    };
  }
}

