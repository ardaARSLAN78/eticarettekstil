import { id } from "../../core/sanitizer/index.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { pageDto } from "./dashboard.dto.js";
import { dashboard } from "./dashboard.service.js";

export const dashboardResolvers = {
  Query: {
    adminDashboard: (_: unknown, __: unknown, c: Context) => dashboard(c),
    adminAuditLogs: (_: unknown, a: { page?: number }, c: Context) => {
      requireAdmin(c);
      const page = pageDto.parse(a.page);
      return c.db.auditLog.findMany({
        skip: (page - 1) * 50,
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, email: true } } },
      });
    },
    inventoryMovements: (_: unknown, a: { variantId: string; page?: number }, c: Context) => {
      requireAdmin(c);
      const page = pageDto.parse(a.page);
      return c.db.stockMovement.findMany({
        where: { variantId: id.parse(a.variantId) },
        skip: (page - 1) * 50,
        take: 50,
        orderBy: { createdAt: "desc" },
      });
    },
  },
};
