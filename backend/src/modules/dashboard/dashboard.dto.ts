import { z } from "zod";
export const pageDto = z.number().int().min(1).max(10000).default(1);
