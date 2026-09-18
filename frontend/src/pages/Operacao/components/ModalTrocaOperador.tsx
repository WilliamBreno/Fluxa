import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as turnosApi from "@/api/turnos.api";
import * as usuariosApi from "@/api/usuarios.api";
import type { Usuario } from "@/api/usuarios.api";

interface ModalTrocaOperadorProps {
  aberto: boolean;
  turnoId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function ModalTrocaOperador({ aberto, turnoId, onFechar, onSucesso }: ModalTrocaOperadorProps) {
  const { notificar } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [operadorNovoId, setOperadorNovoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    usuariosApi.listarUsuarios().then((lista) => {
      setUsuarios(lista);
      if (lista[0]) setOperadorNovoId(lista[0].id);
    });
  }, [aberto]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await turnosApi.trocarOperador(turnoId, operadorNovoId, motivo || undefined);
      notificar("Operador do turno alterado.", "sucesso");
      onSucesso();
      onFechar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo="Trocar operador do turno" onFechar={onFechar}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Select
          label="Novo responsável"
          opcoes={usuarios.map((u) => ({ value: u.id, label: `${u.nome} (${u.roleGlobal})` }))}
          value={operadorNovoId}
          onChange={(e) => setOperadorNovoId(e.target.value)}
        />
        <Input
          label="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: troca de turno, saída para almoço"
        />
        <Button type="submit" disabled={enviando}>
          {enviando ? "Confirmando…" : "Confirmar troca"}
        </Button>
      </form>
    </Modal>
  );
}
