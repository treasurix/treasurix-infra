import { NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC || "https://api.devnet.solana.com";
const MOCK_USDC_MINT = new PublicKey("61ro7AExqfk4dZYoCyRzTahahCC2TdUUZ4M5epMPunJf");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("address");

  if (!walletAddress) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const connection = new Connection(DEVNET_RPC, "confirmed");
    const pubkey = new PublicKey(walletAddress);

    // Fetch SOL balance
    const solLamports = await connection.getBalance(pubkey);
    const solBalance = solLamports / LAMPORTS_PER_SOL;

    // Fetch Mock USDC balance
    let usdcBalance = 0;
    try {
      const usdcAta = await getAssociatedTokenAddress(MOCK_USDC_MINT, pubkey);
      const usdcAccount = await getAccount(connection, usdcAta);
      usdcBalance = Number(usdcAccount.amount) / 1_000_000; // 6 decimals
    } catch {
      // ATA doesn't exist or has zero balance
      usdcBalance = 0;
    }

    return NextResponse.json({
      sol: solBalance.toFixed(4),
      usdc: usdcBalance.toFixed(2),
    });
  } catch (error) {
    console.error("Failed to fetch wallet balance:", error);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}
