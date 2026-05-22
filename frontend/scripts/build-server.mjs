import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await esbuild.build({
  entryPoints: [path.join(root, "server/index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(root, "dist/index.js"),
  packages: "external",
  alias: {
    "@shared": path.join(root, "shared"),
  },
});

console.log("Server bundle: dist/index.js");
