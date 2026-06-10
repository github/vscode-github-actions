/**
 * Allowed tunnel host patterns. The GitHub token is sent as a Bearer token
 * to these hosts, so this list must be kept tight.
 */
const ALLOWED_TUNNEL_HOST_PATTERN = /\.devtunnels\.ms$/;

export function validateTunnelUrl(raw: string): {valid: true; url: string} | {valid: false; reason: string} {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {valid: false, reason: "Invalid URL format"};
  }

  if (parsed.protocol !== "wss:") {
    return {valid: false, reason: `URL must use wss:// scheme, got "${parsed.protocol.replace(":", "")}://"`};
  }

  if (!parsed.hostname) {
    return {valid: false, reason: "URL must include a host"};
  }

  if (!ALLOWED_TUNNEL_HOST_PATTERN.test(parsed.hostname)) {
    return {valid: false, reason: `Host "${parsed.hostname}" is not an allowed tunnel domain`};
  }

  if (parsed.username || parsed.password) {
    return {valid: false, reason: "Credentials in tunnel URL are not allowed"};
  }

  return {valid: true, url: parsed.toString()};
}
