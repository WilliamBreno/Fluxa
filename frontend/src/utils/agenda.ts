import type { StatusAgendamento } from "@/api/agendamentos.api";

export const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTOU: "Faltou",
};

export const VARIANTE_STATUS: Record<StatusAgendamento, "success" | "danger" | "warning" | "neutral" | "info"> = {
  AGENDADO: "neutral",
  CONFIRMADO: "info",
  EM_ATENDIMENTO: "warning",
  CONCLUIDO: "success",
  CANCELADO: "neutral",
  FALTOU: "danger",
};

/** Espelha agendamentos.regras.ts do backend — usado só para decidir quais botões mostrar. */
export const TRANSICOES_STATUS: Record<StatusAgendamento, StatusAgendamento[]> = {
  AGENDADO: ["CONFIRMADO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "FALTOU"],
  CONFIRMADO: ["AGENDADO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "FALTOU"],
  EM_ATENDIMENTO: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: [],
  FALTOU: [],
};

export const STATUS_EDITAVEIS: StatusAgendamento[] = ["AGENDADO", "CONFIRMADO"];
export const STATUS_INATIVOS: StatusAgendamento[] = ["CANCELADO", "FALTOU"];

export function inicioDoDia(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function somarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

/** Semana começando na segunda-feira (padrão comercial brasileiro). */
export function inicioDaSemana(d: Date): Date {
  const r = inicioDoDia(d);
  const diaSemana = (r.getDay() + 6) % 7;
  return somarDias(r, -diaSemana);
}

export function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** yyyy-mm-dd no fuso local (toISOString usaria UTC e viraria o dia depois das 21h). */
export function paraInputData(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function paraInputHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function deInputs(data: string, hora: string): Date {
  const [a, m, d] = data.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min, 0, 0);
}

export function formatarHora(valor: string | Date): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Só a primeira letra: `text-transform: capitalize` geraria "19 De Outubro". */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatarDiaExtenso(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function duracaoMinutos(inicio: string | Date, fim: string | Date): number {
  return Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60_000);
}

export function formatarTelefone(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const d = digitos.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export function formatarCpf(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const d = digitos.replace(/\D/g, "");
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Máscara progressiva para campo de telefone enquanto digita. */
export function mascararTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function mascararCep(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Link wa.me — assume Brasil (+55) quando o número vem só com DDD. */
export function linkWhatsApp(telefone: string | null | undefined, mensagem?: string): string | null {
  if (!telefone) return null;
  const d = telefone.replace(/\D/g, "");
  if (d.length < 10) return null;
  const numero = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${numero}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}

export function idade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null;
  const [a, m, d] = dataNascimento.slice(0, 10).split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return anos;
}

/** Data "pura" (sem hora) vinda do banco: formata sem passar por fuso, senão 15/03 vira 14/03. */
export function formatarDataPura(valor: string | null): string {
  if (!valor) return "";
  const [a, m, d] = valor.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}
