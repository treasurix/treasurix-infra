"use client";

import "@/lib/cloak-browser-shim";

/** Side-effect import above runs before Privy tree; keeps Cloak relay decoding working in the browser. */
export function BufferPolyfill() {
  return null;
}
