import type { ReactNode } from "react";

interface Coluna<T> {
  cabecalho: string;
  render: (item: T) => ReactNode;
  chave: string;
}

interface TableProps<T> {
  colunas: Coluna<T>[];
  itens: T[];
  chaveItem: (item: T) => string;
  vazio?: string;
}

export function Table<T>({ colunas, itens, chaveItem, vazio = "Nenhum registro encontrado." }: TableProps<T>) {
  if (itens.length === 0) {
    return (
      <p style={{ color: "var(--fx-text-tertiary)", padding: "24px 0", textAlign: "center" }}>{vazio}</p>
    );
  }

  return (
    <table className="fx-table">
      <thead>
        <tr>
          {colunas.map((c) => (
            <th key={c.chave}>{c.cabecalho}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
          <tr key={chaveItem(item)}>
            {colunas.map((c) => (
              <td key={c.chave}>{c.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
