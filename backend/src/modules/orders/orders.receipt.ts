import { createHmac } from "node:crypto";
import { config } from "../../core/config/index.js";

export const receiptToken = (orderId: string) =>
  createHmac("sha256", Buffer.from(config.ENCRYPTION_KEY, "hex"))
    .update(`quantia:receipt:${orderId}`)
    .digest("hex");
