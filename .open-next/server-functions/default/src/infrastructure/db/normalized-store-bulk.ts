/**
 * Chunked multi-row INSERT helper for normalized Postgres writes.
 */
import type { PoolClient } from "pg";

/** One multi-row INSERT (chunked) instead of a query per row. `casts[i]` adds a type cast to the i-th column's placeholder (e.g. "jsonb" for JSON payloads). */
export async function bulkInsert(
  client: PoolClient,
  table: string,
  columns: string[],
  casts: (string | null)[],
  rows: unknown[][],
  conflict = "",
): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 500;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const params: unknown[] = [];
    const tuples = chunk.map((row) => {
      const placeholders = row.map((value, idx) => {
        params.push(value);
        const cast = casts[idx];
        return cast ? `$${params.length}::${cast}` : `$${params.length}`;
      });
      return `(${placeholders.join(",")})`;
    });
    await client.query(
      `insert into ${table} (${columns.join(",")}) values ${tuples.join(",")} ${conflict}`,
      params,
    );
  }
}
