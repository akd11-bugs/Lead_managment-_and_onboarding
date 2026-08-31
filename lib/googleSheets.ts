import { JWT } from 'google-auth-library'

let client: JWT | null = null

function getClient(): JWT {
  if (client) return client
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are not configured — set both in .env to sync from Google Sheets.'
    )
  }
  // Env vars often mangle a literal newline in a multiline private key into
  // an escaped "\n" sequence — undo that before handing it to the JWT client.
  const key = rawKey.replace(/\\n/g, '\n')
  client = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return client
}

// Reads a range as a 2D array of cell values (row 0 is whatever's first in
// the range — callers decide whether that's a header row).
export async function getSheetRows(spreadsheetId: string, range: string): Promise<string[][]> {
  const jwt = getClient()
  const { token } = await jwt.getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Sheets API error (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { values?: unknown[][] }
  return (data.values ?? []).map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
}
