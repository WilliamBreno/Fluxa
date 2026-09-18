import type { RoleUsuario } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        nome: string;
        email: string;
        roleGlobal: RoleUsuario;
        superAdmin: boolean;
        lojaId?: string;
        roleNaLoja?: RoleUsuario;
      };
    }
  }
}

export {};
