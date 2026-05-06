import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@cloak.dev/sdk-devnet"],
  // Hoisted workspace `node_modules` at repo root — stabilizes server trace/chunks in monorepos.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
