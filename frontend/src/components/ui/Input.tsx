import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  erro?: string;
}

export function Input({ label, erro, id, className = "", ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="fx-field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={`fx-input ${erro ? "fx-input--erro" : ""} ${className}`} {...rest} />
      {erro && <span className="fx-erro-msg">{erro}</span>}
    </div>
  );
}
