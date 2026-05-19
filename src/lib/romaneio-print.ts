export function printRomaneio(opts: {
  emittedAt: Date;
  checker: string;
  driver: string;
  branch: string;
  volumes: string[];
}) {
  const dateStr = opts.emittedAt.toLocaleString("pt-BR");
  const rows = opts.volumes.map((v) => `<tr><td>${escapeHtml(v)}</td></tr>`).join("");
  // Pad with empty rows up to a minimum (visual fidelity with model)
  const minRows = Math.max(0, 30 - opts.volumes.length);
  const padding = Array.from({ length: minRows }).map(() => `<tr><td>&nbsp;</td></tr>`).join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Romaneio de Entregas</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 16px; color: #000; }
  .sheet { width: 100%; max-width: 800px; margin: 0 auto; }
  .row { display: flex; border: 1px solid #000; border-top: none; }
  .row:first-of-type { border-top: 1px solid #000; }
  .cell { padding: 8px 10px; border-right: 1px solid #000; }
  .cell:last-child { border-right: none; }
  .header { font-weight: 900; font-size: 22px; text-align: center; padding: 14px; }
  .brand { font-weight: 900; font-size: 28px; color: #b3001b; padding: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 35%; border-right: 1px solid #000; }
  .brand small { color: #1a3a8a; font-size: 14px; letter-spacing: 2px; display:block; }
  .brand-title { flex: 1; }
  .label { font-size: 11px; color: #333; text-transform: uppercase; font-weight: 700; }
  .value { font-size: 14px; font-weight: 600; min-height: 18px; margin-top: 2px; }
  .filial-row .cell { padding: 6px 10px; }
  .filial-label { flex: 0 0 35%; }
  .filial-label .value { font-size: 32px; font-weight: 900; letter-spacing: 1px; }
  .filial-value { flex: 1; display: flex; align-items: center; font-size: 22px; font-weight: 700; }
  table.volumes { width: 100%; border-collapse: collapse; border: 1px solid #000; border-top: none; }
  table.volumes thead th { border: 1px solid #000; padding: 6px; font-weight: 900; font-size: 13px; text-align: center; }
  table.volumes tbody td { border: 1px solid #000; padding: 4px 8px; height: 22px; font-size: 12px; font-family: 'Courier New', monospace; }
  .total { display: flex; border: 1px solid #000; border-top: none; padding: 8px 10px; font-weight: 900; font-size: 13px; text-transform: uppercase; gap: 8px; }
  .total span.qty { font-size: 16px; }
  .sign-row { display: flex; border: 1px solid #000; border-top: none; }
  .sign-cell { flex: 1; padding: 14px 10px; border-right: 1px solid #000; min-height: 50px; }
  .sign-cell:last-child { border-right: none; }
  .sign-cell .label { display: block; margin-bottom: 18px; }
  .moto-row { padding: 10px; border: 1px solid #000; border-top: none; font-weight: 700; font-size: 13px; text-transform: uppercase; min-height: 36px; }
  @media print {
    @page { size: A4; margin: 10mm; }
    body { padding: 0; }
    .no-print { display: none; }
  }
  .actions { text-align: center; margin: 16px 0; }
  .actions button { padding: 10px 24px; font-size: 14px; cursor: pointer; }
</style>
</head><body>
<div class="actions no-print">
  <button onclick="window.print()">Imprimir / Salvar como PDF</button>
</div>
<div class="sheet">

  <div class="row">
    <div class="brand">
      <div>♥<span style="color:#1a3a8a">+</span><br/>MB<small>FARMÁCIAS</small></div>
    </div>
    <div class="cell brand-title header" style="flex:1">ROMANEIO DE ENTREGAS</div>
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
    <thead><tr><th>VOLUMES / NFs</th></tr></thead>
    <tbody>
      ${rows}
      ${padding}
    </tbody>
  </table>

  <div class="total">
    <span>Total de volumes carregados:</span>
    <span class="qty">${opts.volumes.length}</span>
  </div>

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
