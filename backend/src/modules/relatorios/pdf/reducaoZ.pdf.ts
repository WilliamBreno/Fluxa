import PDFDocument from "pdfkit";

interface ConteudoRelatorio {
  terminal: { nome: string; codigo: string };
  numeroSequencialTurno: number;
  periodo: string;
  dataAbertura: string | Date;
  dataFechamento: string | Date | null;
  fundoTrocoInformado: string;
  totalVendasPorForma: Record<string, string>;
  totalVendas: string;
  totalSangrias: string;
  totalSuprimentos: string;
  quantidadeCupons: number;
  ticketMedio: string;
  contagens: Array<{
    formaPagamento: string;
    valorContado: string;
    valorEsperado?: string;
    divergencia?: string;
    classificacao?: string | null;
  }>;
  divergenciaTotal: string;
  classificacaoGeral?: string | null;
  causaDivergencia: string | null;
}

/** Gera o PDF da Redução Z (fechamento definitivo) a partir do snapshot já gravado. */
export function gerarPdfReducaoZ(
  conteudo: ConteudoRelatorio,
  numeroSequencial: number,
  hashIntegridade: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Fluxa — Relatório de Fechamento (Redução Z)", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#666").text(`Relatório nº ${numeroSequencial}`, { align: "center" });
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(11);
    doc.text(`Terminal: ${conteudo.terminal.nome} (${conteudo.terminal.codigo})`);
    doc.text(`Turno: #${conteudo.numeroSequencialTurno} — ${conteudo.periodo}`);
    doc.text(`Abertura: ${new Date(conteudo.dataAbertura).toLocaleString("pt-BR")}`);
    doc.text(
      `Fechamento: ${conteudo.dataFechamento ? new Date(conteudo.dataFechamento).toLocaleString("pt-BR") : "-"}`
    );
    doc.text(`Fundo de troco inicial: R$ ${conteudo.fundoTrocoInformado}`);
    doc.moveDown(1);

    doc.fontSize(13).text("Resumo de vendas", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11);
    for (const [forma, valor] of Object.entries(conteudo.totalVendasPorForma)) {
      doc.text(`${forma}: R$ ${valor}`);
    }
    doc.moveDown(0.3);
    doc.text(`Total de vendas: R$ ${conteudo.totalVendas}`);
    doc.text(`Total de sangrias: R$ ${conteudo.totalSangrias}`);
    doc.text(`Total de suprimentos: R$ ${conteudo.totalSuprimentos}`);
    doc.text(`Quantidade de cupons: ${conteudo.quantidadeCupons}`);
    doc.text(`Ticket médio: R$ ${conteudo.ticketMedio}`);
    doc.moveDown(1);

    doc.fontSize(13).text("Contagem cega e divergência por forma de pagamento", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10);
    for (const c of conteudo.contagens) {
      doc.text(
        `${c.formaPagamento}: contado R$ ${c.valorContado} | esperado R$ ${c.valorEsperado ?? "-"} | ` +
          `divergência R$ ${c.divergencia ?? "-"} (${c.classificacao ?? "-"})`
      );
    }
    doc.moveDown(0.5);
    doc.fontSize(12).text(
      `Divergência total: R$ ${conteudo.divergenciaTotal} — ${conteudo.classificacaoGeral ?? "-"}`
    );
    if (conteudo.causaDivergencia) {
      doc.fontSize(10).fillColor("#333").text(`Causa registrada: ${conteudo.causaDivergencia}`);
    }

    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor("#888")
      .text(`Hash de integridade (SHA-256): ${hashIntegridade}`, { align: "left" });

    doc.end();
  });
}
