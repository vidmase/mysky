import crypto from 'crypto'

/**
 * AES-256-GCM for secrets the app stores on behalf of a user — today, their
 * provider API keys. GCM rather than CBC so a tampered ciphertext fails to
 * decrypt instead of returning plausible garbage.
 *
 * The key is derived from API_KEY_ENCRYPTION_SECRET with scrypt. A fixed salt
 * is deliberate: the secret is a high-entropy env var rather than a password,
 * and a per-row salt would have to be stored next to the ciphertext anyway.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // GCM's standard nonce length
const KEY_SALT = 'mysky.user-api-keys.v1'

export interface SealedSecret {
    ciphertext: string
    iv: string
    authTag: string
}

function derivedKey(): Buffer {
    const secret = process.env.API_KEY_ENCRYPTION_SECRET

    // Failing loudly here beats storing a key under a guessable default: a
    // silent fallback would encrypt every user's key with a constant everyone
    // can read in this file.
    if (!secret) {
        throw new Error(
            'API_KEY_ENCRYPTION_SECRET is not set. Generate one with ' +
            '`openssl rand -base64 32` and add it to your environment.'
        )
    }
    if (secret.length < 32) {
        throw new Error(
            'API_KEY_ENCRYPTION_SECRET is too short: it needs at least 32 characters. ' +
            'Generate one with `openssl rand -base64 32`.'
        )
    }

    return crypto.scryptSync(secret, KEY_SALT, 32)
}

export function seal(plaintext: string): SealedSecret {
    const iv = crypto.randomBytes(IV_BYTES)
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey(), iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

    return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
    }
}

export function open(sealed: SealedSecret): string {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        derivedKey(),
        Buffer.from(sealed.iv, 'base64')
    )
    decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64'))

    return Buffer.concat([
        decipher.update(Buffer.from(sealed.ciphertext, 'base64')),
        decipher.final(),
    ]).toString('utf8')
}
