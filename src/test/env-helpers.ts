/** Writable NODE_ENV in tests (TS marks process.env.NODE_ENV read-only). */
export function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    writable: true,
  });
}
