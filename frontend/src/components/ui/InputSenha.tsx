import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";

interface InputSenhaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  erro?: string;
  ajuda?: string;
}

/** Campo de senha com botão para mostrar/ocultar o que foi digitado. */
export function InputSenha({ label, erro, ajuda, id, className = "", ...rest }: InputSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="fx-field">
      {label && (
        <label htmlFor={inputId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {label}
          {ajuda && <InfoTooltip texto={ajuda} />}
        </label>
      )}
      <div className="fx-input-senha">
        <input
          id={inputId}
          type={visivel ? "text" : "password"}
          className={`fx-input ${erro ? "fx-input--erro" : ""} ${className}`}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          {...rest}
        />
        <button
          type="button"
          className="fx-input-senha__botao"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          aria-controls={inputId}
        >
          {visivel ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
        </button>
      </div>
      {erro && <span className="fx-erro-msg">{erro}</span>}
    </div>
  );
}
