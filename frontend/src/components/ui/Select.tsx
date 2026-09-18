import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  erro?: string;
  opcoes: { value: string; label: string }[];
}

export function Select({ label, erro, opcoes, id, className = "", ...rest }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="fx-field">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select id={selectId} className={`fx-select ${className}`} {...rest}>
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {erro && <span className="fx-erro-msg">{erro}</span>}
    </div>
  );
}
