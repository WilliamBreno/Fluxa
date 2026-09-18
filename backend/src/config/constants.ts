export const ROLE_HIERARQUIA = {
  OPERADOR: 0,
  SUPERVISOR: 1,
  GERENTE: 2,
  ADMIN: 3,
} as const;

export type RoleUsuarioKey = keyof typeof ROLE_HIERARQUIA;

export function roleAtendeMinimo(role: RoleUsuarioKey, minimo: RoleUsuarioKey): boolean {
  return ROLE_HIERARQUIA[role] >= ROLE_HIERARQUIA[minimo];
}

export const FORMAS_PAGAMENTO_EM_DINHEIRO = ["DINHEIRO"] as const;
