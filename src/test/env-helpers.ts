/** Writable NODE_ENV in tests (TS marks process.env.NODE_ENV read-only). */
export function setNodeEnv(value: string): void {
  (process.env as { NODE_ENV?: string }).NODE_ENV = value;
}
