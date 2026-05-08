import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@cloak.dev/sdk-devnet"],
  // Hoisted workspace `node_modules` at repo root — stabilizes server trace/chunks in monorepos.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  webpack: (config, { webpack, isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve("buffer"),
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
