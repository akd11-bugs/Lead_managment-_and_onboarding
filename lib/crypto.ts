import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

export class DecryptionError extends Error {}

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is not configured. Generate one with `openssl rand -base64 32` and set it in .env.'
    )
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes — generate with `openssl rand -base64 32`.')
  }
  cachedKey = key
  return cachedKey
}

/** Encrypts a UTF-8 string, returning "iv:authTag:ciphertext" (all base64). */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, ciphertext].map((b) => b.toString('base64')).join(':')
}

/** Reverses encrypt(). Throws DecryptionError on a malformed payload, wrong key, or tampering. */
export function decrypt(payload: string): string {
  const key = getKey()
  const parts = payload.split(':')
  if (parts.length !== 3) throw new DecryptionError('Malformed ciphertext')
  const [ivB64, authTagB64, ciphertextB64] = parts
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
    return plaintext.toString('utf8')
  } catch {
    throw new DecryptionError('Failed to decrypt payload — wrong key or corrupted data')
  }
}
