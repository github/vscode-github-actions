import sodium = require("tweetsodium");
import util = require("util");
import { atob, btoa } from "abab";

function decode(encoded: string): Uint8Array {
  const bytes = atob(encoded)!
    .split("")
    .map((x: string) => x.charCodeAt(0));
  return Uint8Array.from(bytes);
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(bytes)))!;
}

export function encodeSecret(key: string, value: string): string {
  const encoder = new util.TextEncoder();
  // Convert the message and key to Uint8Array's
  const messageBytes = encoder.encode(value);
  const keyBytes = decode(key);

  // Encrypt using LibSodium.
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);

  // Base64 the encrypted secret
  return encode(encryptedBytes);
}
