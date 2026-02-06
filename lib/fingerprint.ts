import crypto from "crypto";

export function fingerprint(ip: string): string {
  if (!process.env.ANTI_BOT_SECRET) {
    throw new Error("ANTI_BOT_SECRET не заданий");
  }

  return crypto
    .createHmac("sha256", process.env.ANTI_BOT_SECRET)
    .update(ip)
    .digest("hex");
}
