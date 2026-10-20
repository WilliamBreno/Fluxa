import type { Request, Response } from "express";
import * as agendamentosService from "./agendamentos.service";
import type { ListarAgendamentosQuery } from "./agendamentos.schemas";

function ctx(req: Request) {
  return { usuarioId: req.usuario!.id, lojaId: req.usuario!.lojaId! };
}

export async function criarAgendamentoController(req: Request, res: Response) {
  res.status(201).json(await agendamentosService.criar(req.body, ctx(req)));
}

export async function listarAgendamentosController(req: Request, res: Response) {
  res.json(await agendamentosService.listar(req.usuario!.lojaId!, req.query as unknown as ListarAgendamentosQuery));
}

export async function resumoAgendamentosController(req: Request, res: Response) {
  const query = req.query as unknown as ListarAgendamentosQuery;
  res.json(await agendamentosService.resumo(req.usuario!.lojaId!, query.inicio, query.fim));
}

export async function obterAgendamentoController(req: Request, res: Response) {
  res.json(await agendamentosService.obter(req.usuario!.lojaId!, req.params.id));
}

export async function atualizarAgendamentoController(req: Request, res: Response) {
  res.json(await agendamentosService.atualizar(req.usuario!.lojaId!, req.params.id, req.body, ctx(req)));
}

export async function alterarStatusAgendamentoController(req: Request, res: Response) {
  res.json(
    await agendamentosService.alterarStatus(req.usuario!.lojaId!, req.params.id, req.body.status, req.body.motivo, ctx(req))
  );
}

export async function listarProfissionaisController(req: Request, res: Response) {
  res.json(await agendamentosService.listarProfissionais(req.usuario!.lojaId!));
}
