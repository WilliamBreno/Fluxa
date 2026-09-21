import { type CampoLogico, DICIONARIO_SINONIMOS, normalizarCabecalho } from "./colunas.dicionario";

export type MapeamentoColunas = Partial<Record<CampoLogico, string>>;

export interface ResultadoDeteccao {
  mapeamento: MapeamentoColunas;
  /** Campos obrigatórios que não foram detectados com confiança — precisam de mapeamento manual. */
  camposPendentes: CampoLogico[];
}

const CAMPOS_OBRIGATORIOS: CampoLogico[] = ["valorBruto", "dataVenda", "dataPagamento"];

/**
 * Detecta, para cada campo lógico, qual coluna do cabeçalho do CSV corresponde
 * a ele, por comparação exata (após normalização) com o dicionário de
 * sinônimos. Nunca adivinha por semelhança parcial — um cabeçalho que não bate
 * exatamente com nenhum sinônimo fica de fora do mapeamento automático.
 */
export function detectarColunas(cabecalhos: string[]): ResultadoDeteccao {
  const normalizados = cabecalhos.map((c) => ({ original: c, normalizado: normalizarCabecalho(c) }));
  const mapeamento: MapeamentoColunas = {};

  for (const [campo, sinonimos] of Object.entries(DICIONARIO_SINONIMOS) as [CampoLogico, string[]][]) {
    const sinonimosNormalizados = sinonimos.map(normalizarCabecalho);
    const encontrado = normalizados.find((c) => sinonimosNormalizados.includes(c.normalizado));
    if (encontrado) {
      mapeamento[campo] = encontrado.original;
    }
  }

  const camposPendentes = CAMPOS_OBRIGATORIOS.filter((campo) => !mapeamento[campo]);

  return { mapeamento, camposPendentes };
}
