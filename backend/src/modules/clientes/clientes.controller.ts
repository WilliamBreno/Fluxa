import type { Request, Response } from "express";
import * as clientesService from "./clientes.service";
import * as auditoriaService from "../auditoria/auditoria.service";
import { gerarCsvBr } from "../relatorios/csv/csv.util";
import type { ListarClientesQuery } from "./clientes.schemas";
import { AppError } from "../../middlewares/errorHandler";
import { roleAtendeMinimo, type RoleUsuarioKey } from "../../config/constants";

function ctx(req: Request) {
  return { usuarioId: req.usuario!.id, lojaId: req.usuario!.lojaId! };
}

export async function criarClienteController(req: Request, res: Response) {
  res.status(201).json(await clientesService.criar(req.body, ctx(req)));
}

export async function listarClientesController(req: Request, res: Response) {
  res.json(await clientesService.listar(req.usuario!.lojaId!, req.query as unknown as ListarClientesQuery));
}

export async function buscarClientesController(req: Request, res: Response) {
  const busca = String(req.query.q ?? "").trim();
  res.json(await clientesService.buscarRapido(req.usuario!.lojaId!, busca));
}

export async function obterClienteController(req: Request, res: Response) {
  res.json(await clientesService.obter(req.usuario!.lojaId!, req.params.id));
}

export async function atualizarClienteController(req: Request, res: Response) {
  const role = (req.usuario!.roleNaLoja ?? req.usuario!.roleGlobal) as RoleUsuarioKey;
  if (req.body.ativo !== undefined && !roleAtendeMinimo(role, "SUPERVISOR")) {
    throw new AppError("Inativar ou reativar cliente exige perfil SUPERVISOR ou superior.", 403);
  }
  res.json(await clientesService.atualizar(req.usuario!.lojaId!, req.params.id, req.body, ctx(req)));
}

export async function listarTagsController(req: Request, res: Response) {
  res.json(await clientesService.listarTags(req.usuario!.lojaId!));
}

export async function listarNotasController(req: Request, res: Response) {
  res.json(await clientesService.listarNotas(req.usuario!.lojaId!, req.params.id));
}

export async function criarNotaController(req: Request, res: Response) {
  res.status(201).json(await clientesService.criarNota(req.usuario!.lojaId!, req.params.id, req.body.texto, req.usuario!.id));
}

export async function historicoClienteController(req: Request, res: Response) {
  res.json(await clientesService.historico(req.usuario!.lojaId!, req.params.id));
}

export async function exportarClientesController(req: Request, res: Response) {
  const query = req.query as unknown as ListarClientesQuery;
  const clientes = await clientesService.exportar(req.usuario!.lojaId!, query);

  await auditoriaService.registrar({
    lojaId: req.usuario!.lojaId,
    usuarioId: req.usuario!.id,
    acao: "EXPORTACAO_RELATORIO",
    entidade: "Cliente",
    detalhes: { relatorio: "clientes", formato: "csv", total: clientes.length },
  });

  const csv = gerarCsvBr(clientes, [
    { chave: "nome", cabecalho: "Nome" },
    { chave: "cpf", cabecalho: "CPF" },
    { chave: "telefone", cabecalho: "Telefone" },
    { chave: "email", cabecalho: "E-mail" },
    {
      chave: "dataNascimento",
      cabecalho: "Nascimento",
      formatar: (c) => (c.dataNascimento ? c.dataNascimento.toISOString().slice(0, 10).split("-").reverse().join("/") : ""),
    },
    { chave: "cidade", cabecalho: "Cidade" },
    { chave: "uf", cabecalho: "UF" },
    { chave: "tags", cabecalho: "Tags", formatar: (c) => c.tags.join(", ") },
    { chave: "atendimentos", cabecalho: "Atendimentos concluídos" },
    { chave: "ultimaVisita", cabecalho: "Última visita" },
    { chave: "ativo", cabecalho: "Ativo", formatar: (c) => (c.ativo ? "Sim" : "Não") },
    { chave: "createdAt", cabecalho: "Cadastrado em" },
  ]);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="clientes.csv"');
  res.send(csv);
}
