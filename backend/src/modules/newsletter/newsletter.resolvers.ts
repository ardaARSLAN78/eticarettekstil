import type { Context } from "../../graphql/context.js";
import { subscribe } from "./newsletter.service.js";

export const newsletterResolvers = {
  Mutation: {
    subscribeNewsletter: (_: unknown, a: { email: string; consent: boolean }, c: Context) =>
      subscribe(c, a),
  },
};
