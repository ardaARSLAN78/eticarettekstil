import { z } from "zod";
export const reportDaysDto = z.number().int().min(1).max(365).default(30);
