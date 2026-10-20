import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as clientesApi from "@/api/clientes.api";
import type { Cliente, ClienteInput } from "@/api/clientes.api";
import { mascararCep, mascararCpf, mascararTelefone } from "@/utils/agenda";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

const ORIGENS = ["", "Indicação", "Instagram", "Google", "Passou na frente", "WhatsApp", "Outro"];

interface ModalClienteProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: (cliente: Cliente) => void;
  /** Sem cliente = cadastro novo. */
  cliente?: Cliente | null;
  /** Nome já digitado em outro lugar (ex.: busca do agendamento). */
  nomeInicial?: string;
}

type Form = Record<
  "nome" | "cpf" | "telefone" | "email" | "dataNascimento" | "cep" | "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf" | "origem" | "observacoes" | "tags",
  string
>;

function formDe(cliente?: Cliente | null, nomeInicial = ""): Form {
  return {
    nome: cliente?.nome ?? nomeInicial,
    cpf: cliente?.cpf ? mascararCpf(cliente.cpf) : "",
    telefone: cliente?.telefone ? mascararTelefone(cliente.telefone) : "",
    email: cliente?.email ?? "",
    dataNascimento: cliente?.dataNascimento?.slice(0, 10) ?? "",
    cep: cliente?.cep ? mascararCep(cliente.cep) : "",
    logradouro: cliente?.logradouro ?? "",
    numero: cliente?.numero ?? "",
    complemento: cliente?.complemento ?? "",
    bairro: cliente?.bairro ?? "",
    cidade: cliente?.cidade ?? "",
    uf: cliente?.uf ?? "",
    origem: cliente?.origem ?? "",
    observacoes: cliente?.observacoes ?? "",
    tags: cliente?.tags.join(", ") ?? "",
  };
}

export function ModalCliente({ aberto, onFechar, onSalvo, cliente, nomeInicial }: ModalClienteProps) {
  const { notificar } = useToast();
  const [form, setForm] = useState<Form>(() => formDe(cliente, nomeInicial));
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [mostrarEndereco, setMostrarEndereco] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setForm(formDe(cliente, nomeInicial));
    setErros({});
    setMostrarEndereco(!!(cliente?.cep || cliente?.logradouro || cliente?.cidade));
  }, [aberto, cliente, nomeInicial]);

  function campo<K extends keyof Form>(chave: K, valor: string) {
    setForm((f) => ({ ...f, [chave]: valor }));
    if (erros[chave]) setErros((e) => ({ ...e, [chave]: undefined }));
  }

  // Preenche o endereço pelo CEP (ViaCEP é público e sem chave). Falha silenciosa:
  // o funcionário só digita à mão.
  async function buscarCep(cepMascarado: string) {
    const cep = cepMascarado.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (dados.erro) return;
      setForm((f) => ({
        ...f,
        logradouro: f.logradouro || dados.logradouro || "",
        bairro: f.bairro || dados.bairro || "",
        cidade: f.cidade || dados.localidade || "",
        uf: f.uf || dados.uf || "",
      }));
    } catch {
      /* sem rede ou CEP inexistente */
    } finally {
      setBuscandoCep(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Eventos do React atravessam portais: sem isso o submit subiria até o
    // formulário de agendamento que abriu este modal.
    e.stopPropagation();
    const payload: ClienteInput = {
      nome: form.nome,
      cpf: form.cpf || null,
      telefone: form.telefone || null,
      email: form.email || null,
      dataNascimento: form.dataNascimento || null,
      cep: form.cep || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      origem: form.origem || null,
      observacoes: form.observacoes || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    setSalvando(true);
    try {
      const salvo = cliente ? await clientesApi.atualizarCliente(cliente.id, payload) : await clientesApi.criarCliente(payload);
      notificar(cliente ? "Cadastro atualizado." : "Cliente cadastrado.", "sucesso");
      onSalvo(salvo);
    } catch (err) {
      const detalhes = (err as { response?: { data?: { detalhes?: { campo: string; mensagem: string }[] } } }).response?.data
        ?.detalhes;
      if (detalhes?.length) {
        setErros(Object.fromEntries(detalhes.map((d) => [d.campo, d.mensagem])));
        if (detalhes.some((d) => ["cep", "logradouro", "cidade", "uf"].includes(d.campo))) setMostrarEndereco(true);
      } else {
        notificar(mensagemDeErro(err), "erro");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={cliente ? "Editar cliente" : "Novo cliente"} onFechar={onFechar} largura={640}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }} noValidate>
        <div className="fx-form-grid">
          <div className="fx-form-grid__largo">
            <Input
              label="Nome completo"
              required
              autoFocus
              value={form.nome}
              onChange={(e) => campo("nome", e.target.value)}
              erro={erros.nome}
            />
          </div>
          <Input
            label="Telefone / WhatsApp"
            inputMode="tel"
            placeholder="(11) 98765-4321"
            value={form.telefone}
            onChange={(e) => campo("telefone", mascararTelefone(e.target.value))}
            erro={erros.telefone}
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => campo("email", e.target.value)}
            erro={erros.email}
          />
          <Input
            label="CPF"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => campo("cpf", mascararCpf(e.target.value))}
            erro={erros.cpf}
            ajuda="Opcional. Evita cadastro duplicado: o sistema avisa se o CPF já existe na loja."
          />
          <Input
            label="Data de nascimento"
            type="date"
            value={form.dataNascimento}
            onChange={(e) => campo("dataNascimento", e.target.value)}
            erro={erros.dataNascimento}
          />
          <Input
            label="Tags"
            placeholder="vip, indicação"
            value={form.tags}
            onChange={(e) => campo("tags", e.target.value)}
            ajuda="Separe por vírgula. Servem para filtrar a lista de clientes."
          />
          <Select
            label="Como conheceu"
            opcoes={ORIGENS.map((o) => ({ value: o, label: o || "Não informado" }))}
            value={form.origem}
            onChange={(e) => campo("origem", e.target.value)}
          />
        </div>

        {!mostrarEndereco ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarEndereco(true)} style={{ alignSelf: "flex-start" }}>
            + Adicionar endereço
          </Button>
        ) : (
          <>
            <div className="fx-form-secao">Endereço</div>
            <div className="fx-form-grid fx-form-grid--3">
              <Input
                label={buscandoCep ? "CEP (buscando…)" : "CEP"}
                inputMode="numeric"
                value={form.cep}
                onChange={(e) => {
                  const v = mascararCep(e.target.value);
                  campo("cep", v);
                  buscarCep(v);
                }}
                erro={erros.cep}
              />
              <div className="fx-form-grid__span2">
                <Input label="Logradouro" value={form.logradouro} onChange={(e) => campo("logradouro", e.target.value)} />
              </div>
              <Input label="Número" value={form.numero} onChange={(e) => campo("numero", e.target.value)} />
              <Input label="Complemento" value={form.complemento} onChange={(e) => campo("complemento", e.target.value)} />
              <Input label="Bairro" value={form.bairro} onChange={(e) => campo("bairro", e.target.value)} />
              <div className="fx-form-grid__span2">
                <Input label="Cidade" value={form.cidade} onChange={(e) => campo("cidade", e.target.value)} />
              </div>
              <Select
                label="UF"
                opcoes={[{ value: "", label: "—" }, ...UFS.map((u) => ({ value: u, label: u }))]}
                value={form.uf}
                onChange={(e) => campo("uf", e.target.value)}
              />
            </div>
          </>
        )}

        <Textarea
          label="Observações internas"
          placeholder="Preferências, alergias, restrições de horário…"
          value={form.observacoes}
          onChange={(e) => campo("observacoes", e.target.value)}
          erro={erros.observacoes}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando || form.nome.trim().length < 2}>
            {salvando ? "Salvando…" : cliente ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
