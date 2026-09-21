import { parse } from "csv-parse/sync";

export function removerBom(texto: string): string {
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

/** Detecta ';' ou ',' pela primeira linha (cabeçalho) — quem aparece mais vezes vence. */
export function detectarSeparador(primeiraLinha: string): ";" | "," {
  const pontoEVirgula = (primeiraLinha.match(/;/g) ?? []).length;
  const virgula = (primeiraLinha.match(/,/g) ?? []).length;
  return pontoEVirgula >= virgula ? ";" : ",";
}

export interface CsvParseado {
  cabecalhos: string[];
  linhas: Record<string, string>[];
}

export function parseCsvBruto(conteudoBruto: string): CsvParseado {
  const conteudo = removerBom(conteudoBruto).replace(/\r\n/g, "\n").trim();
  if (!conteudo) return { cabecalhos: [], linhas: [] };

  const primeiraLinha = conteudo.split("\n")[0];
  const delimiter = detectarSeparador(primeiraLinha);

  const linhas: Record<string, string>[] = parse(conteudo, {
    columns: true,
    delimiter,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const cabecalhos = linhas.length > 0 ? Object.keys(linhas[0]) : primeiraLinha.split(delimiter).map((c) => c.trim());

  return { cabecalhos, linhas };
}

/**
 * Converte texto de valor monetário no padrão brasileiro ("1.234,56" ou
 * "1234,56") para number. Nunca usa float para armazenar — este number é só
 * uma etapa intermediária antes de virar Prisma.Decimal no service.
 */
export function paraNumeroBr(valorTexto: string): number {
  const limpo = valorTexto.trim().replace(/[^\d,.-]/g, "");
  if (limpo.includes(",")) {
    // vírgula é o separador decimal; pontos antes dela são milhar.
    return Number(limpo.replace(/\./g, "").replace(",", "."));
  }
  return Number(limpo);
}

/** Converte "dd/mm/aaaa" ou "dd/mm/aaaa hh:mm[:ss]" para Date (UTC). */
export function paraDataBr(valorTexto: string): Date {
  const [dataParte, horaParte] = valorTexto.trim().split(/\s+/);
  const [dia, mes, ano] = dataParte.split("/").map(Number);
  const [hora, minuto, segundo] = (horaParte ?? "0:0:0").split(":").map(Number);
  return new Date(Date.UTC(ano, (mes ?? 1) - 1, dia ?? 1, hora ?? 0, minuto ?? 0, segundo ?? 0));
}
