/** react-rnd / re-resizable expect Node `process` in the browser bundle. */
const g = globalThis as typeof globalThis & {
  process?: { env: { NODE_ENV: string } };
};
if (typeof g.process === "undefined") {
  g.process = { env: { NODE_ENV: import.meta.env.MODE } };
}
