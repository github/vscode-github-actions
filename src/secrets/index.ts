import libsodium = require("libsodium-wrappers")
import { atob, btoa } from "abab";

function decode(encoded: string): Uint8Array {
  const bytes = (atob(encoded) as string).split("").map((x: string) => x.charCodeAt(0));
  return Uint8Array.from(bytes);
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(bytes))) as string;
}

export function encodeSecret(key: string, value: string): string {
  const encoder = new TextEncoder();
  // Convert the message and key to Uint8Array's
  const messageBytes = encoder.encode(value);
  const keyBytes = decode(key);

  // Encrypt using LibSodium.
  const encryptedBytes = libsodium.crypto_box_seal(messageBytes, keyBytes);

  // Base64 the encrypted secret
  return encode(encryptedBytes);
}
