import libsodium from "libsodium-wrappers";

export async function encodeSecret(key: string, value: string): Promise<string> {
  await libsodium.ready;
  const sec = libsodium.from_string(value);
  const k = libsodium.from_base64(key, libsodium.base64_variants.ORIGINAL);
  const encsec = libsodium.crypto_box_seal(sec, k);
  return libsodium.to_base64(encsec, libsodium.base64_variants.ORIGINAL);
}
