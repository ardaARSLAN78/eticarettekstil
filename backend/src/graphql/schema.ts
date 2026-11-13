import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLJSON } from "graphql-type-json";
import { commonSchema } from "./common.schema.js";
import { authSchema } from "../modules/auth/auth.schema.js";
import { authResolvers } from "../modules/auth/auth.resolvers.js";
import { accountSchema } from "../modules/account/account.schema.js";
import { accountResolvers } from "../modules/account/account.resolvers.js";
import { catalogSchema } from "../modules/catalog/catalog.schema.js";
import { catalogResolvers } from "../modules/catalog/catalog.resolvers.js";
import { taxonomySchema } from "../modules/taxonomy/taxonomy.schema.js";
import { taxonomyResolvers } from "../modules/taxonomy/taxonomy.resolvers.js";
import { cartsSchema } from "../modules/carts/carts.schema.js";
import { cartsResolvers } from "../modules/carts/carts.resolvers.js";
import { campaignsSchema } from "../modules/campaigns/campaigns.schema.js";
import { campaignsResolvers } from "../modules/campaigns/campaigns.resolvers.js";
import { ordersSchema } from "../modules/orders/orders.schema.js";
import { ordersResolvers } from "../modules/orders/orders.resolvers.js";
import { paymentsSchema } from "../modules/payments/payments.schema.js";
import { paymentsResolvers } from "../modules/payments/payments.resolvers.js";
import { settingsSchema } from "../modules/settings/settings.schema.js";
import { settingsResolvers } from "../modules/settings/settings.resolvers.js";
import { reviewsSchema } from "../modules/reviews/reviews.schema.js";
import { reviewsResolvers } from "../modules/reviews/reviews.resolvers.js";
import { newsletterSchema } from "../modules/newsletter/newsletter.schema.js";
import { newsletterResolvers } from "../modules/newsletter/newsletter.resolvers.js";
import { seoSchema } from "../modules/seo/seo.schema.js";
import { seoResolvers } from "../modules/seo/seo.resolvers.js";
import { dashboardSchema } from "../modules/dashboard/dashboard.schema.js";
import { dashboardResolvers } from "../modules/dashboard/dashboard.resolvers.js";
import { mediaSchema } from "../modules/media/media.schema.js";
import { mediaResolvers } from "../modules/media/media.resolvers.js";
import { reportsSchema } from "../modules/reports/reports.schema.js";
import { reportsResolvers } from "../modules/reports/reports.resolvers.js";
import { customersSchema } from "../modules/customers/customers.schema.js";
import { customersResolvers } from "../modules/customers/customers.resolvers.js";
import { usersSchema } from "../modules/users/users.schema.js";
import { usersResolvers } from "../modules/users/users.resolvers.js";
import { inventorySchema } from "../modules/inventory/inventory.schema.js";
import { inventoryResolvers } from "../modules/inventory/inventory.resolvers.js";
import { marketingSchema } from "../modules/marketing/marketing.schema.js";
import { marketingResolvers } from "../modules/marketing/marketing.resolvers.js";

export const schema = makeExecutableSchema({
  typeDefs: [
    commonSchema,
    authSchema,
    accountSchema,
    catalogSchema,
    taxonomySchema,
    cartsSchema,
    campaignsSchema,
    ordersSchema,
    paymentsSchema,
    settingsSchema,
    reviewsSchema,
    newsletterSchema,
    seoSchema,
    dashboardSchema,
    mediaSchema,
    reportsSchema,
    customersSchema,
    usersSchema,
    inventorySchema,
    marketingSchema,
  ],
  resolvers: [
    { JSON: GraphQLJSON, Query: { health: () => "ok" }, Mutation: { _version: () => "1.0.0" } },
    authResolvers,
    accountResolvers,
    catalogResolvers,
    taxonomyResolvers,
    cartsResolvers,
    campaignsResolvers,
    ordersResolvers,
    paymentsResolvers,
    settingsResolvers,
    reviewsResolvers,
    newsletterResolvers,
    seoResolvers,
    dashboardResolvers,
    mediaResolvers,
    reportsResolvers,
    customersResolvers,
    usersResolvers,
    inventoryResolvers,
    marketingResolvers,
  ],
});
