/**
 * Cloak devnet — documented endpoints and mints (see Cloak devnet docs).
 * SDK `@cloak.dev/sdk-devnet` pre-configures program + relay; these are for UI and copy.
 *
 * Relay:   https://api.devnet.cloak.ag
 * Solana:  https://api.devnet.solana.com
 * Program: Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h
 */
export const CLOAK_DEVNET_RELAY_URL = "https://api.devnet.cloak.ag" as const;

export const CLOAK_DEVNET_RPC_DEFAULT = "https://api.devnet.solana.com" as const;

export const CLOAK_DEVNET_PROGRAM_ID =
  "Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h" as const;

/** Native SOL mint (wrapped convention). */
export const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112" as const;

/** Devnet-only mock USDC, 6 decimals — use Cloak faucet to mint. */
export const DEVNET_MOCK_USDC_MINT = "61ro7AExqfk4dZYoCyRzTahahCC2TdUUZ4M5epMPunJf" as const;

export const SOLANA_DEVNET_FAUCET_URL = "https://faucet.solana.com/" as const;
export const CLOAK_DEVNET_FAUCET_URL = "https://devnet.cloak.ag/privacy/faucet" as const;
