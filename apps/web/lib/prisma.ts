// Prisma Client + pg driver adapter — https://www.prisma.io/docs/prisma-orm/add-to-existing-project/postgresql
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Next.js dev keeps `globalThis.prisma` across HMR. After `prisma generate` adds models,
 * the cached client can lack new delegates (`treasuryCloakState`, etc.) → runtime undefined.
 */
function prismaClientHasExpectedDelegates(client: PrismaClient): boolean {
  const d = (client as unknown as { treasuryCloakState?: { findUnique?: unknown } }).treasuryCloakState;
  return typeof d?.findUnique === "function";
}

function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && prismaClientHasExpectedDelegates(existing)) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => {});
  }
  const fresh = createPrismaClient();
  globalForPrisma.prisma = fresh;
  return fresh;
}

export const prisma = getPrisma();
