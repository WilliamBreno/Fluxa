import { useContext } from "react";
import { OfflineContext } from "./OfflineProvider";

export function useOfflineStatus() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOfflineStatus precisa estar dentro de <OfflineProvider>");
  return ctx;
}
