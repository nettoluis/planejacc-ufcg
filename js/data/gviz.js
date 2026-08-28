// Fetches a single tab of a Google Sheet via the (undocumented but stable)
// gviz visualization endpoint, which returns JSON wrapped in a JS callback.
export async function fetchGvizSheet(spreadsheetId, sheetName, { headerRow = true } = {}) {
  const headersParam = headerRow ? '&headers=1' : '';
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}${headersParam}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar aba "${sheetName}" (${response.status})`);
  }

  const text = await response.text();
  const jsonText = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
  const data = JSON.parse(jsonText);

  if (data.status === 'error') {
    const detail = (data.errors || []).map((e) => e.detailed_message || e.message).join('; ');
    throw new Error(`Erro na planilha "${sheetName}": ${detail}`);
  }

  const cols = data.table.cols.map((c) => c.label || c.id);
  const rows = data.table.rows.map((r) => r.c.map((cell) => (cell ? cell.v : null)));
  return { cols, rows };
}
