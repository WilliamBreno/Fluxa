function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function digitosIguais(valor: string): boolean {
  return valor.split("").every((d) => d === valor[0]);
}

function validarCpf(cpf: string): boolean {
  if (cpf.length !== 11 || digitosIguais(cpf)) return false;

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  const digito2 = calcularDigito(cpf.slice(0, 10), 11);
  return digito1 === Number(cpf[9]) && digito2 === Number(cpf[10]);
}

function validarCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || digitosIguais(cnpj)) return false;

  const calcularDigito = (base: string): number => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(cnpj.slice(0, 12));
  const digito2 = calcularDigito(cnpj.slice(0, 13));
  return digito1 === Number(cnpj[12]) && digito2 === Number(cnpj[13]);
}

/** Aceita CPF (pessoa física/autônomo) ou CNPJ, com dígito verificador real — não só contagem de caracteres. */
export function validarCpfCnpj(valor: string): boolean {
  const digitos = apenasDigitos(valor);
  if (digitos.length === 11) return validarCpf(digitos);
  if (digitos.length === 14) return validarCnpj(digitos);
  return false;
}

export function normalizarCpfCnpj(valor: string): string {
  return apenasDigitos(valor);
}
