import { Connection } from "@solana/web3.js";
import { CLOAK_DEVNET_PROGRAM_ID, CLOAK_DEVNET_RPC_DEFAULT } from "@/lib/cloak-devnet-reference";

export { CLOAK_DEVNET_PROGRAM_ID };

export function getDevnetRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC?.trim() || CLOAK_DEVNET_RPC_DEFAULT;
}

export function getDevnetConnection(): Connection {
  return new Connection(getDevnetRpcUrl(), "confirmed");
}
