export function printRomaneio(opts: {
  emittedAt: Date;
  checker: string;
  driver: string;
  branch: string;
  volumes: string[];
  partialCutCount?: number;
}) {
  const dateStr = opts.emittedAt.toLocaleString("pt-BR");

  // Build a 3-column table: each row contains up to 3 volume codes
  const cols = 3;
  const rowsCount = Math.ceil(opts.volumes.length / cols);
  const minRows = Math.max(rowsCount, 20);
  let bodyRows = "";
  for (let r = 0; r < minRows; r++) {
    const a = opts.volumes[r * cols] ?? "";
    const b = opts.volumes[r * cols + 1] ?? "";
    const c = opts.volumes[r * cols + 2] ?? "";
    bodyRows += `<tr><td>${escapeHtml(a) || "&nbsp;"}</td><td>${escapeHtml(b) || "&nbsp;"}</td><td>${escapeHtml(c) || "&nbsp;"}</td></tr>`;
  }

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Romaneio de Entregas</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 12px; color: #000; font-size: 12px; }
  .sheet { width: 100%; max-width: 800px; margin: 0 auto; }
  .row { display: flex; border: 1px solid #000; border-top: none; }
  .row:first-of-type { border-top: 1px solid #000; }
  .cell { padding: 5px 8px; border-right: 1px solid #000; }
  .cell:last-child { border-right: none; }

  .header-row { display: flex; align-items: center; border: 1px solid #000; padding: 8px 12px; gap: 16px; }
  .brand-text { font-weight: 900; font-size: 16px; letter-spacing: 0.5px; white-space: nowrap; }
  .doc-title { flex: 1; text-align: center; font-weight: 900; font-size: 18px; letter-spacing: 1px; }

  .label { font-size: 10px; color: #333; text-transform: uppercase; font-weight: 700; }
  .value { font-size: 12px; font-weight: 600; min-height: 14px; margin-top: 1px; }

  .filial-row .cell { padding: 4px 8px; }
  .filial-label { flex: 0 0 28%; }
  .filial-label .value { font-size: 22px; font-weight: 900; letter-spacing: 1px; }
  .filial-value { flex: 1; display: flex; align-items: center; font-size: 16px; font-weight: 700; }

  table.volumes { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; table-layout: fixed; }
  table.volumes thead th { border: 1px solid #000; padding: 4px; font-weight: 900; font-size: 11px; text-align: center; }
  table.volumes tbody td {
    border: 1px solid #000;
    padding: 2px 6px;
    height: 16px;
    font-size: 11pt;
    font-family: 'Courier New', monospace;
    width: 33.33%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .total { display: flex; border: 1px solid #000; border-top: none; padding: 5px 8px; font-weight: 900; font-size: 12px; text-transform: uppercase; gap: 8px; }
  .total span.qty { font-size: 14px; }

  .moto-row { padding: 6px 8px; border: 1px solid #000; border-top: none; font-weight: 700; font-size: 12px; text-transform: uppercase; }

  .sign-row { display: flex; border: 1px solid #000; border-top: none; }
  .sign-cell { flex: 1; padding: 8px 10px; border-right: 1px solid #000; min-height: 38px; }
  .sign-cell:last-child { border-right: none; }
  .sign-cell .label { display: block; margin-bottom: 14px; }

  @media print {
    @page { size: A4; margin: 10mm 12mm; }
    body { padding: 0; font-size: 11px; }
    .no-print { display: none; }
    table.volumes tbody td { font-size: 11pt; padding: 1px 5px; height: 14px; }
  }
  .actions { text-align: center; margin: 12px 0; }
  .actions button { padding: 10px 24px; font-size: 14px; cursor: pointer; }
</style>
</head><body>
<div class="actions no-print">
  <button onclick="window.print()">Imprimir / Salvar como PDF</button>
</div>
<div class="sheet">

  <div class="header-row">
    <div class="brand-text">MB Farmácias</div>
    <div class="doc-title">ROMANEIO DE ENTREGAS</div>
  </div>

  <div class="row">
    <div class="cell" style="flex:1">
      <div class="label">Data:</div>
      <div class="value">${escapeHtml(dateStr)}</div>
    </div>
    <div class="cell" style="flex:1">
      <div class="label">Conferente:</div>
      <div class="value">${escapeHtml(opts.checker)}</div>
    </div>
    <div class="cell" style="flex:1">
      <div class="label">Motorista:</div>
      <div class="value">${escapeHtml(opts.driver)}</div>
    </div>
  </div>

  <div class="row filial-row">
    <div class="cell filial-label">
      <div class="value">FILIAL</div>
    </div>
    <div class="cell filial-value">${escapeHtml(opts.branch)}</div>
  </div>

  <table class="volumes">
    <thead><tr><th colspan="3">VOLUMES / NFs</th></tr></thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>

  <div class="total">
    <span>Total de volumes carregados:</span>
    <span class="qty">${opts.volumes.length}</span>
  </div>
  ${opts.partialCutCount && opts.partialCutCount > 0 ? `
  <div class="moto-row" style="background:#fff3cd; color:#000; font-weight:900;">
    ⚠ ROMANEIO FECHADO COM DIVERGÊNCIA / CORTE DE SALDO DE ${opts.partialCutCount} CAIXA${opts.partialCutCount > 1 ? "S" : ""}.
  </div>` : ""}

  <div class="moto-row">
    MOTORISTA: ${escapeHtml(opts.driver)}
  </div>

  <div class="sign-row">
    <div class="sign-cell">
      <span class="label">Recebido por:</span>
      <div style="border-bottom: 1px solid #000; height: 1px;"></div>
    </div>
    <div class="sign-cell" style="flex: 0 0 35%">
      <span class="label">Data / Hora:</span>
      <div style="border-bottom: 1px solid #000; height: 1px;"></div>
    </div>
  </div>

</div>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Permita pop-ups para imprimir o romaneio.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
