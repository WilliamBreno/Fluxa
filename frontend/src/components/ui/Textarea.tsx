import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  erro?: string;
}

export function Textarea({ label, erro, id, className = "", rows = 3, ...rest }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="fx-field">
      {label && <label htmlFor={textareaId}>{label}</label>}
      <textarea id={textareaId} rows={rows} className={`fx-input fx-textarea ${erro ? "fx-input--erro" : ""} ${className}`} {...rest} />
      {erro && <span className="fx-erro-msg">{erro}</span>}
    </div>
  );
}
