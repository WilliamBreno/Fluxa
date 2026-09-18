import { api } from "./client";

export type FormaPagamento = "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX" | "VALE" | "FIADO" | "OUTRO";
export type PeriodoTurno = "MANHA" | "TARDE" | "NOITE" | "INTEGRAL";
export type StatusTurno = "ABERTO" | "FECHADO";

export interface Turno {
  id: string;
  numeroSequencial: number;
  periodo: PeriodoTurno;
  status: StatusTurno;
  dataAbertura: string;
  dataFechamento: string | null;
  fundoTrocoInformado: string;
  fundoTrocoSugerido: string | null;
  terminal: { id: string; nome: string; codigo: string };
  operadorResponsavelAtual: { id: string; nome: string };
}

export async function sugestaoFundoTroco(terminalId: string) {
  const { data } = await api.get<{ sugestao: string | null }>("/turnos/sugestao-fundo-troco", {
    params: { terminalId },
  });
  return data.sugestao;
}

export async function abrirTurno(input: {
  terminalId: string;
  periodo: PeriodoTurno;
  fundoTrocoInformado: number;
  observacoesAbertura?: string;
}) {
  const { data } = await api.post<Turno>("/turnos/abrir", input);
  return data;
}

export async function listarTurnos(params?: { terminalId?: string; status?: StatusTurno }) {
  const { data } = await api.get("/turnos", { params });
  return data as { itens: (Turno & { fechamento?: { status: string; classificacaoGeral?: string } })[]; total: number };
}

export async function buscarTurno(turnoId: string) {
  const { data } = await api.get<Turno>(`/turnos/${turnoId}`);
  return data;
}

export interface ResumoSaldoTurno {
  saldoPorForma: Record<FormaPagamento, string>;
  totalVendasPorForma: Record<FormaPagamento, string>;
  totalVendas: string;
  totalSangrias: string;
  totalSuprimentos: string;
  quantidadeCupons: number;
  ticketMedio: string;
}

export async function leituraX(turnoId: string) {
  const { data } = await api.get<{ turno: Turno; resumo: ResumoSaldoTurno }>(`/turnos/${turnoId}/leitura-x`);
  return data;
}

export async function trocarOperador(turnoId: string, operadorNovoId: string, motivo?: string) {
  await api.post(`/turnos/${turnoId}/trocar-operador`, { operadorNovoId, motivo });
}
