import { requireAdmin, type Context } from "../../graphql/context.js";
import * as service from "./campaigns.service.js";

export const campaignsResolvers = {
  Query: {
    adminCampaigns: (_: unknown, __: unknown, c: Context) => {
      requireAdmin(c);
      return c.db.campaign.findMany({
        take: 200,
        orderBy: { createdAt: "desc" },
        include: service.campaignInclude,
      });
    },
  },
  Mutation: {
    saveCampaign: (_: unknown, a: { input: unknown }, c: Context) =>
      service.saveCampaign(c, a.input),
    saveCoupon: (_: unknown, a: { input: unknown }, c: Context) => service.saveCoupon(c, a.input),
    applyCoupon: (_: unknown, a: { code: string }, c: Context) => service.applyCoupon(c, a.code),
  },
  Campaign: {
    startsAt: (c: { startsAt: Date }) => c.startsAt.toISOString(),
    endsAt: (c: { endsAt: Date }) => c.endsAt.toISOString(),
  },
};
