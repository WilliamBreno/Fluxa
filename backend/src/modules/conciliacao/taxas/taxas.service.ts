import { Bandeira, ModalidadeCartao, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export async function listarTaxas(lojaId: string) {
  return prisma.taxaContratadaCartao.findMany({
    where: { lojaId },
    orderBy: [{ bandeira: "asc" }, { modalidade: "asc" }, { parcelas: "asc" }, { vigenteDesde: "desc" }],
  });
}

interface DefinirTaxaInput {
  lojaId: string;
  bandeira: Bandeira;
  modalidade: ModalidadeCartao;
  parcelas: number;
  taxaPercentual: number;
}

/** Sempre cria uma nova vigência em vez de sobrescrever — preserva o histórico de taxas contratadas. */
export async function definirTaxa(input: DefinirTaxaInput) {
  return prisma.taxaContratadaCartao.create({
    data: {
      lojaId: input.lojaId,
      bandeira: input.bandeira,
      modalidade: input.modalidade,
      parcelas: input.parcelas,
      taxaPercentual: new Prisma.Decimal(input.taxaPercentual.toFixed(2)),
    },
  });
}

export interface AlertaTaxaEfetiva {
  bandeira: Bandeira;
  modalidade: ModalidadeCartao;
  parcelas: number;
  taxaContratada: string;
  taxaEfetivaMedia: string;
  quantidadeTransacoes: number;
  valorTaxaExcedente: string;
}

/** Compara a taxa efetiva (calculada do extrato) com a taxa contratada configurada, por combinação. */
export async function taxaEfetivaVsContratada(lojaId: string, dataInicio: Date, dataFim: Date): Promise<AlertaTaxaEfetiva[]> {
  const [transacoes, taxas] = await Promise.all([
    prisma.transacaoExtratoCartao.findMany({
      where: { lojaId, dataVenda: { gte: dataInicio, lte: dataFim } },
      select: { bandeira: true, modalidade: true, parcelas: true, valorBruto: true, valorTaxa: true },
    }),
    prisma.taxaContratadaCartao.findMany({ where: { lojaId }, orderBy: { vigenteDesde: "desc" } }),
  ]);

  function taxaContratadaPara(bandeira: Bandeira | null, modalidade: ModalidadeCartao | null, parcelas: number) {
    if (!bandeira || !modalidade) return null;
    return taxas.find((t) => t.bandeira === bandeira && t.modalidade === modalidade && t.parcelas === parcelas) ?? null;
  }

  const grupos = new Map<
    string,
    { bandeira: Bandeira; modalidade: ModalidadeCartao; parcelas: number; somaBruto: Prisma.Decimal; somaTaxa: Prisma.Decimal; quantidade: number }
  >();

  for (const t of transacoes) {
    if (!t.bandeira || !t.modalidade) continue;
    const chave = `${t.bandeira}|${t.modalidade}|${t.parcelas}`;
    const atual = grupos.get(chave) ?? {
      bandeira: t.bandeira,
      modalidade: t.modalidade,
      parcelas: t.parcelas,
      somaBruto: new Prisma.Decimal(0),
      somaTaxa: new Prisma.Decimal(0),
      quantidade: 0,
    };
    atual.somaBruto = atual.somaBruto.plus(t.valorBruto);
    atual.somaTaxa = atual.somaTaxa.plus(t.valorTaxa);
    atual.quantidade += 1;
    grupos.set(chave, atual);
  }

  const alertas: AlertaTaxaEfetiva[] = [];
  for (const grupo of grupos.values()) {
    if (grupo.somaBruto.isZero()) continue;
    const taxaEfetiva = grupo.somaTaxa.div(grupo.somaBruto).times(100);
    const contratada = taxaContratadaPara(grupo.bandeira, grupo.modalidade, grupo.parcelas);
    if (!contratada) continue;

    if (taxaEfetiva.greaterThan(contratada.taxaPercentual)) {
      const excedentePercentual = taxaEfetiva.minus(contratada.taxaPercentual).div(100);
      alertas.push({
        bandeira: grupo.bandeira,
        modalidade: grupo.modalidade,
        parcelas: grupo.parcelas,
        taxaContratada: contratada.taxaPercentual.toFixed(2),
        taxaEfetivaMedia: taxaEfetiva.toFixed(2),
        quantidadeTransacoes: grupo.quantidade,
        valorTaxaExcedente: grupo.somaBruto.times(excedentePercentual).toFixed(2),
      });
    }
  }

  return alertas;
}
