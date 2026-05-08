/**
 * Cloak relay / SDK paths sometimes call `readBigInt64LE` on byte payloads. In the browser that value may be a
 * `Uint8Array` (no such method) or an incomplete `Buffer` shim. This module runs once and fixes both cases.
 *
 * Import from any client entry that loads `@cloak.dev/sdk-devnet` (e.g. `PaymentCheckout`, `BufferPolyfill`).
 */
import { Buffer as BufferPolyfill } from "buffer";

const g = globalThis as typeof globalThis & { Buffer?: typeof BufferPolyfill };

// Always use the npm `buffer` implementation in the browser (full Node-compatible API).
g.Buffer = BufferPolyfill;

const u8 = Uint8Array.prototype as Uint8Array & {
  readBigInt64LE?: (offset?: number) => bigint;
  readBigUInt64LE?: (offset?: number) => bigint;
};

if (typeof u8.readBigInt64LE !== "function") {
  Object.defineProperty(u8, "readBigInt64LE", {
    configurable: true,
    writable: true,
    value(this: Uint8Array, offset = 0) {
      const off = Number(offset);
      if (off + 8 > this.byteLength) {
        throw new RangeError("readBigInt64LE: not enough bytes");
      }
      return new DataView(this.buffer, this.byteOffset + off, 8).getBigInt64(true);
    },
  });
}

if (typeof u8.readBigUInt64LE !== "function") {
  Object.defineProperty(u8, "readBigUInt64LE", {
    configurable: true,
    writable: true,
    value(this: Uint8Array, offset = 0) {
      const off = Number(offset);
      if (off + 8 > this.byteLength) {
        throw new RangeError("readBigUInt64LE: not enough bytes");
      }
      return new DataView(this.buffer, this.byteOffset + off, 8).getBigUint64(true);
    },
  });
}

export {};
