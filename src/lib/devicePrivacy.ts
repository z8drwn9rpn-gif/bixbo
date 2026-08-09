import { useEffect, useState } from "react";

export interface DevicePrivacyPreferences {
  biometricLock: boolean;
  pinLock: boolean;
  privacyScreen: boolean;
}

const PREFS_KEY = "bixbo:device-privacy";
const PIN_HASH_KEY = "bixbo:device-pin-hash";
const BIOMETRIC_CREDENTIAL_KEY = "bixbo:device-biometric-credential";
const EVENT = "bixbo:device-privacy-change";

export const DEFAULT_DEVICE_PRIVACY: DevicePrivacyPreferences = {
  biometricLock: false,
  pinLock: false,
  privacyScreen: false,
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function readDevicePrivacy(): DevicePrivacyPreferences {
  if (typeof window === "undefined") return DEFAULT_DEVICE_PRIVACY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<DevicePrivacyPreferences>;
    return { ...DEFAULT_DEVICE_PRIVACY, ...parsed };
  } catch {
    return DEFAULT_DEVICE_PRIVACY;
  }
}

export function writeDevicePrivacy(next: DevicePrivacyPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function patchDevicePrivacy(patch: Partial<DevicePrivacyPreferences>): DevicePrivacyPreferences {
  const next = { ...readDevicePrivacy(), ...patch };
  writeDevicePrivacy(next);
  return next;
}

export function useDevicePrivacy() {
  const [prefs, setPrefs] = useState<DevicePrivacyPreferences>(() => readDevicePrivacy());

  useEffect(() => {
    const refresh = () => setPrefs(readDevicePrivacy());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    prefs,
    patch: (patch: Partial<DevicePrivacyPreferences>) => {
      const next = patchDevicePrivacy(patch);
      setPrefs(next);
      return next;
    },
  };
}

async function derivePinHash(pin: string, salt: Uint8Array): Promise<string> {
  if (!crypto.subtle) throw new Error("Secure PIN hashing is not supported on this device.");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

export async function configurePin(pin: string): Promise<void> {
  const trimmed = pin.trim();
  if (!/^\d{4,8}$/.test(trimmed)) throw new Error("Use a 4–8 digit PIN.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(trimmed, salt);
  window.localStorage.setItem(PIN_HASH_KEY, `${bytesToBase64Url(salt)}.${hash}`);
  patchDevicePrivacy({ pinLock: true });
}

export function removePin(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(PIN_HASH_KEY);
  patchDevicePrivacy({ pinLock: false });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const saved = window.localStorage.getItem(PIN_HASH_KEY);
  if (!saved) return false;
  const [saltRaw, expected] = saved.split(".");
  if (!saltRaw || !expected) return false;
  const actual = await derivePinHash(pin, base64UrlToBytes(saltRaw));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function biometricSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.PublicKeyCredential && navigator.credentials);
}

export async function enrollBiometricLock(): Promise<void> {
  if (!biometricSupported()) throw new Error("Biometric/passkey lock is not supported in this browser.");

  const userId = crypto.getRandomValues(new Uint8Array(16));
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "BIXBO" },
      user: {
        id: userId,
        name: "bixbo-device-lock",
        displayName: "BIXBO device lock",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Biometric enrollment was cancelled.");
  window.localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, bytesToBase64Url(new Uint8Array(credential.rawId)));
  patchDevicePrivacy({ biometricLock: true });
}

export function removeBiometricLock(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
  patchDevicePrivacy({ biometricLock: false });
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!biometricSupported()) return false;
  const rawId = window.localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
  if (!rawId) return false;

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            id: base64UrlToBytes(rawId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

/** One-time migration for the old Profile-only local object. */
export function migrateLegacyDevicePrivacy(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const privacy = (raw as Record<string, unknown>).privacyPrefs;
  if (!privacy || typeof privacy !== "object") return;
  const p = privacy as Record<string, unknown>;
  const current = readDevicePrivacy();
  writeDevicePrivacy({
    ...current,
    privacyScreen: typeof p.blurScreenshots === "boolean" ? p.blurScreenshots : current.privacyScreen,
  });
}
