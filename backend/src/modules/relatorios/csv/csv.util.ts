import { Prisma } from "@prisma/client";

export interface ColunaCsv<T> {
  chave: string;
  cabecalho: string;
  /** Se omitido, usa `linha[chave]` diretamente. */
  formatar?: (linha: T) => unknown;
}

/**
 * CSV pronto para o Excel brasileiro: separador ';', decimal com vírgula,
 * UTF-8 com BOM, datas dd/mm/aaaa hh:mm, e proteção contra injeção de
 * fórmula (célula que começa com =, +, -, @ ganha um apóstrofo na frente,
 * igual ao que o próprio Excel/Google Sheets fazem ao colar texto "perigoso").
 */
export function gerarCsvBr<T>(linhas: T[], colunas: ColunaCsv<T>[]): Buffer {
  const cabecalho = colunas.map((c) => escaparCelula(c.cabecalho)).join(";");
  const corpo = linhas.map((linha) =>
    colunas
      .map((c) => {
        const bruto = c.formatar ? c.formatar(linha) : (linha as Record<string, unknown>)[c.chave];
        return escaparCelula(formatarValor(bruto));
      })
      .join(";")
  );

  const conteudo = [cabecalho, ...corpo].join("\r\n");
  return Buffer.from("﻿" + conteudo, "utf-8");
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return formatarDataHoraBr(valor);
  if (valor instanceof Prisma.Decimal) return valor.toFixed(2).replace(".", ",");
  if (typeof valor === "number") return valor.toString().replace(".", ",");
  return String(valor);
}

const PREFIXOS_PERIGOSOS = ["=", "+", "-", "@"];

function escaparCelula(valorFormatado: string): string {
  let texto = valorFormatado;

  if (PREFIXOS_PERIGOSOS.some((prefixo) => texto.startsWith(prefixo))) {
    texto = "'" + texto;
  }

  if (/[;"\r\n]/.test(texto)) {
    texto = '"' + texto.replace(/"/g, '""') + '"';
  }

  return texto;
}

export function formatarDataHoraBr(data: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${obter("day")}/${obter("month")}/${obter("year")} ${obter("hour")}:${obter("minute")}`;
}
