import { prisma } from "../core/prisma/index.js";
import { scheduleJob } from "../core/queues/index.js";
import { expireUnpaidOrders } from "../modules/orders/orders.service.js";

const stopOrders = scheduleJob("Süresi dolan sipariş rezervasyonları", 30000, () =>
  expireUnpaidOrders(prisma),
);
const stopSessions = scheduleJob("Süresi dolan oturumlar", 3600000, () =>
  prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
);
console.log("Quantia arka plan işçisi hazır.");
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    stopOrders();
    stopSessions();
    await prisma.$disconnect();
    process.exit(0);
  });
