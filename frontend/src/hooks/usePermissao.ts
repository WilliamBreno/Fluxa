import { useAuth } from "./useAuth";

const HIERARQUIA = { OPERADOR: 0, SUPERVISOR: 1, GERENTE: 2, ADMIN: 3 } as const;
type Papel = keyof typeof HIERARQUIA;

export function usePermissao() {
  const { papelAtual } = useAuth();

  function atende(minimo: Papel): boolean {
    if (!papelAtual) return false;
    return HIERARQUIA[papelAtual] >= HIERARQUIA[minimo];
  }

  return { papelAtual, atende };
}
