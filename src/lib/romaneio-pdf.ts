import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generateRomaneioPdf(opts: {
  emittedAt: Date;
  checker: string;
  driver: string;
  branch: string;
  volumes: string[];
}) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ROMANEIO DE CARREGAMENTO", pageW / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fmt = opts.emittedAt.toLocaleString("pt-BR");
  doc.text(`Emitido em: ${fmt}`, 14, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Filial de Destino:", 14, 40);
  doc.setFont("helvetica", "normal");
  doc.text(opts.branch, 50, 40);

  doc.setFont("helvetica", "bold");
  doc.text("Conferente:", 14, 47);
  doc.setFont("helvetica", "normal");
  doc.text(opts.checker, 50, 47);

  doc.setFont("helvetica", "bold");
  doc.text("Motorista:", 14, 54);
  doc.setFont("helvetica", "normal");
  doc.text(opts.driver, 50, 54);

  autoTable(doc, {
    startY: 62,
    head: [["#", "Código do Volume"]],
    body: opts.volumes.map((v, i) => [String(i + 1), v]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [70, 90, 160] },
    columnStyles: { 0: { cellWidth: 20, halign: "center" } },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 80;
  doc.setFontSize(10);
  doc.text(`Total de volumes: ${opts.volumes.length}`, 14, finalY + 10);

  const sigY = Math.max(finalY + 40, doc.internal.pageSize.getHeight() - 50);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(14, sigY, pageW - 14, sigY);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(9);
  doc.text("Assinatura do Recebedor", pageW / 2, sigY + 6, { align: "center" });

  doc.setFontSize(10);
  doc.text("Data do Recebimento: ____/____/______", 14, sigY + 20);

  doc.save(`romaneio-${opts.emittedAt.getTime()}.pdf`);
}
