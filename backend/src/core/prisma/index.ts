import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { config } from "../config/index.js";

export function createDatabase(url = config.DATABASE_URL) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 10 }) });
}

export const prisma = createDatabase();
export type Database = PrismaClient;
