import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "fx-btn",
    `fx-btn--${variant}`,
    size === "sm" ? "fx-btn--sm" : "",
    block ? "fx-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
