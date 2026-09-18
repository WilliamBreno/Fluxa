import ExcelJS from "exceljs";

interface ConteudoRelatorio {
  terminal: { nome: string; codigo: string };
  numeroSequencialTurno: number;
  periodo: string;
  dataAbertura: string | Date;
  dataFechamento: string | Date | null;
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
}

export async function gerarExcelFechamento(conteudo: ConteudoRelatorio): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const resumo = workbook.addWorksheet("Resumo");

  resumo.addRow(["Fluxa — Relatório de Fechamento (Redução Z)"]);
  resumo.addRow([]);
  resumo.addRow(["Terminal", `${conteudo.terminal.nome} (${conteudo.terminal.codigo})`]);
  resumo.addRow(["Turno", `#${conteudo.numeroSequencialTurno} — ${conteudo.periodo}`]);
  resumo.addRow(["Abertura", new Date(conteudo.dataAbertura).toLocaleString("pt-BR")]);
  resumo.addRow([
    "Fechamento",
    conteudo.dataFechamento ? new Date(conteudo.dataFechamento).toLocaleString("pt-BR") : "-",
  ]);
  resumo.addRow([]);
  resumo.addRow(["Total de vendas", conteudo.totalVendas]);
  resumo.addRow(["Total de sangrias", conteudo.totalSangrias]);
  resumo.addRow(["Total de suprimentos", conteudo.totalSuprimentos]);
  resumo.addRow(["Quantidade de cupons", conteudo.quantidadeCupons]);
  resumo.addRow(["Ticket médio", conteudo.ticketMedio]);
  resumo.addRow(["Divergência total", conteudo.divergenciaTotal]);
  resumo.getColumn(1).width = 28;
  resumo.getColumn(2).width = 30;

  const contagem = workbook.addWorksheet("Contagem cega");
  contagem.addRow(["Forma de pagamento", "Valor contado", "Valor esperado", "Divergência", "Classificação"]);
  contagem.getRow(1).font = { bold: true };
  for (const c of conteudo.contagens) {
    contagem.addRow([c.formaPagamento, c.valorContado, c.valorEsperado ?? "", c.divergencia ?? "", c.classificacao ?? ""]);
  }
  contagem.columns.forEach((col) => (col.width = 20));

  const vendasPorForma = workbook.addWorksheet("Vendas por forma");
  vendasPorForma.addRow(["Forma de pagamento", "Total vendido"]);
  vendasPorForma.getRow(1).font = { bold: true };
  for (const [forma, valor] of Object.entries(conteudo.totalVendasPorForma)) {
    vendasPorForma.addRow([forma, valor]);
  }
  vendasPorForma.columns.forEach((col) => (col.width = 22));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export interface LinhaExportacaoContabil {
  data: string;
  totalVendas: string;
  totalSangrias: string;
  totalSuprimentos: string;
  totalPorForma: Record<string, string>;
}

export async function gerarExcelContabil(linhas: LinhaExportacaoContabil[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Exportação contábil");

  const formas = ["DINHEIRO", "DEBITO", "CREDITO", "PIX", "VALE", "FIADO", "OUTRO"];
  planilha.addRow(["Data", "Total vendas", "Sangrias", "Suprimentos", ...formas]);
  planilha.getRow(1).font = { bold: true };

  for (const linha of linhas) {
    planilha.addRow([
      linha.data,
      linha.totalVendas,
      linha.totalSangrias,
      linha.totalSuprimentos,
      ...formas.map((f) => linha.totalPorForma[f] ?? "0.00"),
    ]);
  }
  planilha.columns.forEach((col) => (col.width = 16));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
