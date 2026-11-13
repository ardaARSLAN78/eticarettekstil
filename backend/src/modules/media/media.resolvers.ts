import { requireAdmin, type Context } from "../../graphql/context.js";
import { pageDto } from "../dashboard/dashboard.dto.js";
import { updateMediaAlt } from "./media.service.js";

export const mediaResolvers = {
  Query: {
    adminMedia: (_: unknown, args: { page?: number }, context: Context) => {
      requireAdmin(context);
      const page = pageDto.parse(args.page);

      return context.db.mediaAsset.findMany({
        skip: (page - 1) * 50,
        take: 50,
        orderBy: { createdAt: "desc" },
      });
    },
  },
  Mutation: {
    updateMediaAlt: (_: unknown, args: { id: string; alt: string }, context: Context) =>
      updateMediaAlt(context, args),
  },
};
