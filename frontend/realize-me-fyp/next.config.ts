import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "tldraw",
    "@tldraw/editor",
    "@tldraw/state",
    "@tldraw/state-react",
    "@tldraw/store",
    "@tldraw/tlschema",
    "@tldraw/utils",
    "@tldraw/validate",
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      tldraw: path.resolve(process.cwd(), "node_modules/tldraw"),
      "@tldraw/editor": path.resolve(process.cwd(), "node_modules/@tldraw/editor"),
      "@tldraw/state": path.resolve(process.cwd(), "node_modules/@tldraw/state"),
      "@tldraw/state-react": path.resolve(process.cwd(), "node_modules/@tldraw/state-react"),
      "@tldraw/store": path.resolve(process.cwd(), "node_modules/@tldraw/store"),
      "@tldraw/tlschema": path.resolve(process.cwd(), "node_modules/@tldraw/tlschema"),
      "@tldraw/utils": path.resolve(process.cwd(), "node_modules/@tldraw/utils"),
      "@tldraw/validate": path.resolve(process.cwd(), "node_modules/@tldraw/validate"),
    };
    return config;
  },
};

export default nextConfig;
