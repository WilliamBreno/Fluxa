import { describe, expect, it } from "vitest";
import { intervalosSobrepoem, podeTransicionar } from "../src/modules/agendamentos/agendamentos.regras";
import { alterarStatusSchema, criarAgendamentoSchema } from "../src/modules/agendamentos/agendamentos.schemas";
import { criarClienteSchema } from "../src/modules/clientes/clientes.schemas";

const h = (hhmm: string) => new Date(`2026-10-20T${hhmm}:00-03:00`);

describe("intervalosSobrepoem", () => {
  it("detecta sobreposição parcial", () => {
    expect(intervalosSobrepoem({ inicio: h("10:00"), fim: h("11:00") }, { inicio: h("10:30"), fim: h("11:30") })).toBe(true);
  });

  it("detecta um intervalo contido no outro", () => {
    expect(intervalosSobrepoem({ inicio: h("09:00"), fim: h("12:00") }, { inicio: h("10:00"), fim: h("10:15") })).toBe(true);
  });

  it("não considera conflito quando um termina exatamente quando o outro começa", () => {
    expect(intervalosSobrepoem({ inicio: h("10:00"), fim: h("10:30") }, { inicio: h("10:30"), fim: h("11:00") })).toBe(false);
  });
});

describe("podeTransicionar", () => {
  it("permite o fluxo normal agendado → confirmado → em atendimento → concluído", () => {
    expect(podeTransicionar("AGENDADO", "CONFIRMADO")).toBe(true);
    expect(podeTransicionar("CONFIRMADO", "EM_ATENDIMENTO")).toBe(true);
    expect(podeTransicionar("EM_ATENDIMENTO", "CONCLUIDO")).toBe(true);
  });

  it("não deixa marcar falta de quem já está sendo atendido", () => {
    expect(podeTransicionar("EM_ATENDIMENTO", "FALTOU")).toBe(false);
  });

  it("trava os estados finais", () => {
    for (const final of ["CONCLUIDO", "CANCELADO", "FALTOU"] as const) {
      expect(podeTransicionar(final, "AGENDADO")).toBe(false);
      expect(podeTransicionar(final, "CONFIRMADO")).toBe(false);
    }
  });
});

describe("schemas de agendamento", () => {
  const base = { clienteId: "8f8b7a5e-6c2d-4e1f-9a3b-1c2d3e4f5a6b" };

  it("rejeita término antes do início", () => {
    const r = criarAgendamentoSchema.safeParse({ ...base, inicio: h("11:00"), fim: h("10:00") });
    expect(r.success).toBe(false);
  });

  it("rejeita duração acima de 12 horas", () => {
    const r = criarAgendamentoSchema.safeParse({ ...base, inicio: h("06:00"), fim: new Date(h("06:00").getTime() + 13 * 3600_000) });
    expect(r.success).toBe(false);
  });

  it("exige motivo para cancelar", () => {
    expect(alterarStatusSchema.safeParse({ status: "CANCELADO" }).success).toBe(false);
    expect(alterarStatusSchema.safeParse({ status: "CANCELADO", motivo: "Cliente pediu" }).success).toBe(true);
    expect(alterarStatusSchema.safeParse({ status: "CONFIRMADO" }).success).toBe(true);
  });
});

describe("criarClienteSchema", () => {
  it("normaliza CPF e telefone para só dígitos", () => {
    const r = criarClienteSchema.parse({ nome: "Ana Souza", cpf: "529.982.247-25", telefone: "(11) 98765-4321" });
    expect(r.cpf).toBe("52998224725");
    expect(r.telefone).toBe("11987654321");
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(criarClienteSchema.safeParse({ nome: "Ana Souza", cpf: "529.982.247-26" }).success).toBe(false);
  });

  it("aceita cliente só com nome e transforma campos vazios em null", () => {
    const r = criarClienteSchema.parse({ nome: "Ana", email: "", cpf: "" });
    expect(r.email).toBeNull();
    expect(r.cpf).toBeNull();
  });

  it("deduplica e padroniza tags em minúsculas", () => {
    const r = criarClienteSchema.parse({ nome: "Ana", tags: ["VIP", "vip", "Indicação"] });
    expect(r.tags).toEqual(["vip", "indicação"]);
  });
});
