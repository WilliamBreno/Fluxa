/**
 * Sinônimos de cabeçalho de coluna por campo lógico, usados na detecção
 * automática. Cobre os nomes mais comuns usados por Cielo, Rede, Stone,
 * Getnet, PagBank e Mercado Pago nos extratos exportados em CSV — mas o
 * mapeamento manual (POST /conciliacao/extratos/:id/mapeamento) sempre fica
 * disponível como alternativa para adquirentes/formatos não previstos aqui.
 */
export type CampoLogico =
  | "nsu"
  | "autorizacao"
  | "bandeira"
  | "modalidade"
  | "valorBruto"
  | "valorLiquido"
  | "valorTaxa"
  | "dataVenda"
  | "dataPagamento"
  | "parcelas";

export const DICIONARIO_SINONIMOS: Record<CampoLogico, string[]> = {
  nsu: ["nsu", "nsu/doc", "nr nsu", "numero nsu", "documento", "doc", "nsu do", "codigo nsu"],
  autorizacao: ["autorizacao", "autorização", "cod autorizacao", "código de autorização", "aut", "cv"],
  bandeira: ["bandeira", "cartao", "cartão", "produto"],
  modalidade: ["modalidade", "tipo de venda", "tipo da transacao", "tipo da transação", "forma de pagamento"],
  valorBruto: ["valor bruto", "valor da venda", "valor total", "valor da transacao", "valor da transação", "valor"],
  valorLiquido: ["valor liquido", "valor líquido", "valor a receber", "valor liquido a receber", "valor net"],
  valorTaxa: ["taxa", "desconto", "mdr", "valor da taxa", "valor do desconto", "comissao", "comissão"],
  dataVenda: ["data da venda", "data transacao", "data transação", "data da transacao", "data da transação", "data"],
  dataPagamento: [
    "data de pagamento",
    "data prevista",
    "data de recebimento",
    "data do pagamento",
    "data prevista de pagamento",
    "previsao de pagamento",
    "previsão de pagamento",
  ],
  parcelas: ["parcelas", "n parcelas", "nº parcelas", "parc", "qtd parcelas", "quantidade de parcelas", "parcela"],
};

/** Remove acentos, deixa minúsculo e colapsa espaços — para comparar cabeçalhos com tolerância. */
export function normalizarCabecalho(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
