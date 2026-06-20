/** react-rnd / re-resizable expect Node `process` in the browser bundle. */
if (typeof globalThis.process === "undefined") {
  globalThis.process = { env: { NODE_ENV: import.meta.env.MODE } };
}
