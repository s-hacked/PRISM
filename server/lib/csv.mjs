// Minimal RFC-4180 CSV parser/stringifier (no external dependency).

export function parseCsv(text) {
  // Strip UTF-8 BOM if present (common on Windows-generated files).
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = [];
  for (let r = 1; r < rows.length; r += 1) {
    const line = rows[r];
    if (line.length === 1 && line[0] === '') continue;
    const rec = {};
    headers.forEach((h, idx) => {
      rec[h] = line[idx] !== undefined ? line[idx].trim() : '';
    });
    records.push(rec);
  }
  return { headers, records };
}

export function stringifyCsv(headers, records) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const rec of records) {
    lines.push(headers.map((h) => esc(rec[h])).join(','));
  }
  return lines.join('\n');
}
