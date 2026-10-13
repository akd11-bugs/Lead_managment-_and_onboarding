import { JWT } from 'google-auth-library'

// Env vars often mangle a literal newline in a multiline private key into an
// escaped "\n" sequence, and some hosting dashboards' paste boxes silently
// convert line endings to CRLF — either one leaves Node's OpenSSL 3 PEM
// decoder unable to parse an otherwise-correct key
// (error:1E08010C:DECODER routines::unsupported). Normalize all of it away.
function normalizePrivateKey(raw: string): string {
  let key = raw.trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1)
  }
  return key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

// One service account for the whole deployment — every org shares it rather
// than bringing their own (see components/settings/OrgSheetConnectorCard.tsx):
// an org admin's entire setup is sharing their sheet with this one email,
// not creating their own GCP project/credentials. Built once and reused
// (unlike a rotatable per-org credential, this one only changes via a
// deploy + restart, so there's no staleness risk in caching it).
let client: JWT | null = null

function getClient(): JWT {
  if (client) return client
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY are not configured in .env.')
  }
  client = new JWT({ email, key: normalizePrivateKey(rawKey), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
  return client
}

// Reads a range as a 2D array of cell values (row 0 is whatever's first in
// the range — callers decide whether that's a header row).
export async function getSheetRows(spreadsheetId: string, range: string): Promise<string[][]> {
  const { token } = await getClient().getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Sheets API error (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { values?: unknown[][] }
  return (data.values ?? []).map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
}
