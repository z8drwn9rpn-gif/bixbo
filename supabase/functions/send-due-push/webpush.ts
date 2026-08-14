/**
 * Shared BIXBO Web Push helper (RFC 8291 aes128gcm + RFC 8292 VAPID).
 * Built on WebCrypto only, so it runs unchanged on the Supabase Edge Runtime
 * with no npm/CDN dependency. Imported by both push functions.
 */

export type PushKeys = { p256dh: string; auth: string };
export type PushTarget = { endpoint: string } & PushKeys;

export type SendResult = {
  ok: boolean;
  status: number;
  /** true when the subscription is permanently gone (404 / 410). */
  gone: boolean;
  error?: string;
};

/* ---------------------------------------------------------------- */
/* base64url helpers                                                  */
/* ---------------------------------------------------------------- */

export function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToB64url(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/* ---------------------------------------------------------------- */
/* VAPID                                                              */
/* ---------------------------------------------------------------- */

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function readVapidConfig(): VapidConfig {
  // BIXBO_* holds the verified key pair; the legacy VAPID_* names are a fallback.
  const publicKey = (Deno.env.get("BIXBO_VAPID_PUBLIC_KEY") ?? Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim();
  const privateKey = (Deno.env.get("BIXBO_VAPID_PRIVATE_KEY") ?? Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim();
  const subject = (Deno.env.get("VAPID_SUBJECT") ?? "").trim() || "mailto:notifications@bixbo.app";

  const missing = [
    ...(publicKey ? [] : ["BIXBO_VAPID_PUBLIC_KEY"]),
    ...(privateKey ? [] : ["BIXBO_VAPID_PRIVATE_KEY"]),
  ];
  if (missing.length) {
    throw new Error(`Missing Edge Function secret(s): ${missing.join(", ")}`);
  }

  return { publicKey, privateKey, subject };
}

async function importVapidSigningKey(config: VapidConfig): Promise<CryptoKey> {
  const publicBytes = b64urlToBytes(config.publicKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY is not an uncompressed P-256 public key.");
  }

  let privateBytes = b64urlToBytes(config.privateKey);

  // Some generators emit the scalar as a signed DER integer, i.e. 32 bytes
  // prefixed with a 0x00 padding byte. Strip it before importing.
  if (privateBytes.length === 33 && privateBytes[0] === 0x00) {
    privateBytes = privateBytes.slice(1);
  }

  // Raw 32-byte scalar — the format web-push and most generators emit.
  if (privateBytes.length === 32) {
    return crypto.subtle.importKey(
      "jwk",
      {
        kty: "EC",
        crv: "P-256",
        d: bytesToB64url(privateBytes),
        x: bytesToB64url(publicBytes.slice(1, 33)),
        y: bytesToB64url(publicBytes.slice(33, 65)),
        ext: true,
      },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  }

  // PKCS#8 DER (what `openssl ecparam ... -outform DER` produces).
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      toArrayBuffer(privateBytes),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  } catch {
    throw new Error(
      `VAPID_PRIVATE_KEY is not a usable P-256 key (decoded to ${privateBytes.length} bytes; expected a 32-byte base64url scalar or PKCS#8 DER).`,
    );
  }
}


/**
 * Proves VAPID_PRIVATE_KEY really belongs to VAPID_PUBLIC_KEY by signing with
 * the private scalar and verifying against the advertised public point.
 * A mismatched pair otherwise only shows up as an opaque 403 from Apple/Google.
 */
export async function assertVapidKeyPair(config: VapidConfig): Promise<void> {
  const signingKey = await importVapidSigningKey(config);
  const verifyKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(b64urlToBytes(config.publicKey)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );

  const probe = new TextEncoder().encode("bixbo-vapid-pair-check");
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, probe);
  const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, verifyKey, signature, probe);

  if (!valid) {
    throw new Error(
      "VAPID_PRIVATE_KEY does not match VAPID_PUBLIC_KEY. Generate a fresh VAPID pair and store both secrets.",
    );
  }
}

async function vapidAuthorization(config: VapidConfig, audience: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = bytesToB64url(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    encoder.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: config.subject,
      }),
    ),
  );

  const signingInput = `${header}.${payload}`;
  const key = await importVapidSigningKey(config);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput),
  );

  return `vapid t=${signingInput}.${bytesToB64url(signature)}, k=${config.publicKey}`;
}

/* ---------------------------------------------------------------- */
/* aes128gcm payload encryption (RFC 8291)                            */
/* ---------------------------------------------------------------- */

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", toArrayBuffer(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: toArrayBuffer(salt), info: toArrayBuffer(info) },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function encryptPayload(keys: PushKeys, plaintext: string): Promise<Uint8Array> {
  const clientPublic = b64urlToBytes(keys.p256dh);
  const clientAuth = b64urlToBytes(keys.auth);

  if (clientPublic.length !== 65 || clientPublic[0] !== 0x04) {
    throw new Error("Subscription p256dh key is invalid.");
  }
  if (clientAuth.length !== 16) {
    throw new Error("Subscription auth secret is invalid.");
  }

  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  const clientKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(clientPublic),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeys.privateKey, 256),
  );

  const encoder = new TextEncoder();
  const prk = await hkdf(clientAuth, shared, concat(encoder.encode("WebPush: info\0"), clientPublic, serverPublic), 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, encoder.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", toArrayBuffer(cek), "AES-GCM", false, ["encrypt"]);
  const record = concat(encoder.encode(plaintext), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(nonce) }, aesKey, toArrayBuffer(record)),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  return concat(salt, recordSize, new Uint8Array([serverPublic.length]), serverPublic, ciphertext);
}

/* ---------------------------------------------------------------- */
/* Delivery                                                           */
/* ---------------------------------------------------------------- */

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  category?: string;
  requireInteraction?: boolean;
};

export async function sendWebPush(
  config: VapidConfig,
  target: PushTarget,
  payload: PushPayload,
  ttlSeconds = 3600,
): Promise<SendResult> {
  let audience: string;
  try {
    audience = new URL(target.endpoint).origin;
  } catch {
    return { ok: false, status: 0, gone: true, error: "Invalid endpoint URL." };
  }

  let body: Uint8Array;
  let authorization: string;
  try {
    body = await encryptPayload(target, JSON.stringify(payload));
    authorization = await vapidAuthorization(config, audience);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Encryption failed.";
    return {
      ok: false,
      status: 0,
      // A structurally invalid subscription can never succeed; drop it.
      gone: message.startsWith("Subscription "),
      error: message,
    };
  }

  try {
    const response = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttlSeconds),
        Urgency: "normal",
      },
      body: toArrayBuffer(body),
    });

    if (response.ok) {
      await response.arrayBuffer().catch(() => undefined);
      return { ok: true, status: response.status, gone: false };
    }

    const text = await response.text().catch(() => "");
    return {
      ok: false,
      status: response.status,
      gone: response.status === 404 || response.status === 410,
      error: text.slice(0, 300) || `Push service returned ${response.status}.`,
    };
  } catch (cause) {
    return { ok: false, status: 0, gone: false, error: cause instanceof Error ? cause.message : "Network error." };
  }
}

/* ---------------------------------------------------------------- */
/* HTTP helpers                                                       */
/* ---------------------------------------------------------------- */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Constant-time comparison for shared secrets. */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}
