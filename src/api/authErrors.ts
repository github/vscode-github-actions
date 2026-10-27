type UnauthorizedListener = () => void;

const listeners: UnauthorizedListener[] = [];

/**
 * Whether the error is a GitHub API response rejecting the session token (e.g., it was revoked or has expired)
 */
export function isUnauthorizedError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as {status?: unknown}).status === 401;
}

export function onUnauthorized(listener: UnauthorizedListener): {dispose: () => void} {
  listeners.push(listener);
  return {
    dispose: () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  };
}

export function notifyUnauthorized() {
  listeners.forEach(l => l());
}
