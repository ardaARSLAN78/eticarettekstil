import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./core/config/index.js";
import { prisma } from "./core/prisma/index.js";
import { redis } from "./core/redis/index.js";

if (redis) await redis.connect();
await prisma.$connect();
const server = createServer(createApp());
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.listen(config.PORT, config.HOST, () =>
  console.log(`Quantia API hazır: http://${config.HOST}:${config.PORT}`),
);

for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    server.close(async () => {
      await prisma.$disconnect();
      if (redis) await redis.quit();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
