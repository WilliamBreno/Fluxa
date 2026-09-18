import { createHash } from "crypto";

export function sha256Json(payload: unknown): string {
  const json = JSON.stringify(payload);
  return createHash("sha256").update(json).digest("hex");
}
