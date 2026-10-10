import type { EvalLabel } from "../../src/domain/matching-eval/types";

const ALLOWED = new Set(["good", "acceptable", "bad"]);

export function parseLabelCsv(text: string): {
  rows: {
    pair_id: string;
    job_id: string;
    candidate_id: string;
    label: string;
    note: string;
  }[];
  errors: string[];
} {
  const t = text.replace(/^\uFEFF/, "");
  const parsed = parseCsvRows(t);
  if (!parsed.length) return { rows: [], errors: ["empty file"] };
  const header = parsed[0].map((h) => h.trim());
  const need = ["pair_id", "job_id", "candidate_id", "label", "note"];
  for (const col of need) {
    if (!header.includes(col)) return { rows: [], errors: [`missing column: ${col}`] };
  }
  const idx = (name: string) => header.indexOf(name);
  const rows: {
    pair_id: string;
    job_id: string;
    candidate_id: string;
    label: string;
    note: string;
  }[] = [];
  const errors: string[] = [];
  for (let ri = 1; ri < parsed.length; ri++) {
    const cols = parsed[ri];
    const pair_id = cols[idx("pair_id")]?.trim() ?? "";
    if (!pair_id) continue;
    const label = (cols[idx("label")] ?? "").trim().toLowerCase();
    const note = (cols[idx("note")] ?? "").trim();
    if (label && !ALLOWED.has(label)) {
      errors.push(`row ${ri + 1}: invalid label "${label}"`);
      continue;
    }
    rows.push({
      pair_id,
      job_id: cols[idx("job_id")]?.trim() ?? "",
      candidate_id: cols[idx("candidate_id")]?.trim() ?? "",
      label,
      note,
    });
  }
  return { rows, errors };
}

export function rowsToEvalLabels(
  rows: { job_id: string; candidate_id: string; label: string; note: string }[],
): EvalLabel[] {
  const out: EvalLabel[] = [];
  for (const r of rows) {
    if (!ALLOWED.has(r.label)) continue;
    if (!r.job_id || !r.candidate_id) continue;
    out.push({
      jobId: r.job_id,
      candidateId: r.candidate_id,
      label: r.label as EvalLabel["label"],
      reason: r.note || undefined,
    });
  }
  return out;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const line: string[] = [];
  let field = "";
  let inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ",") {
      line.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      line.push(field);
      if (line.some((x) => x.trim())) rows.push([...line]);
      line.length = 0;
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field || line.length) {
    line.push(field);
    rows.push(line);
  }
  return rows;
}
