import type { InputHTMLAttributes } from "react";
import { InfoTooltip } from "./InfoTooltip";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  erro?: string;
  /** Texto de ajuda opcional — mostra um ícone "i" ao lado do label. */
  ajuda?: string;
}

export function Input({ label, erro, ajuda, id, className = "", ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="fx-field">
      {label && (
        <label htmlFor={inputId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {label}
          {ajuda && <InfoTooltip texto={ajuda} />}
        </label>
      )}
      <input id={inputId} className={`fx-input ${erro ? "fx-input--erro" : ""} ${className}`} {...rest} />
      {erro && <span className="fx-erro-msg">{erro}</span>}
    </div>
  );
}
