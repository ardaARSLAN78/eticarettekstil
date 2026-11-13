import type { Context } from "../../graphql/context.js";
import { getReport } from "./reports.service.js";
export const reportsResolvers = {
  Query: {
    adminReports: (_: unknown, args: { days?: number }, context: Context) =>
      getReport(context, args.days),
  },
};
