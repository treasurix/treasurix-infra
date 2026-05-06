/** Privy modal options — keep Solana + extension discovery aligned across entry points. */
export const privyWalletFirstLogin = {
  loginMethods: ["wallet"] as ("wallet")[],
  walletChainType: "solana-only" as const,
};

export const privyWalletOrEmailLogin = {
  loginMethods: ["wallet", "email"] as ("wallet" | "email")[],
  walletChainType: "solana-only" as const,
};
