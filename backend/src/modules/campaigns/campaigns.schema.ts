export const campaignsSchema = /* GraphQL */ `
  type Coupon {
    id: ID!
    code: String!
    campaignId: ID!
    active: Boolean!
    usageLimit: Int
  }
  type Campaign {
    id: ID!
    name: String!
    slug: String!
    description: String!
    type: String!
    value: Int!
    active: Boolean!
    automatic: Boolean!
    startsAt: String!
    endsAt: String!
    minimumSubtotal: Int!
    maximumDiscount: Int
    usageLimit: Int
    perEmailLimit: Int
    products: [Product!]!
    categories: [Category!]!
    coupons: [Coupon!]!
  }
  extend type Query {
    adminCampaigns: [Campaign!]!
  }
  extend type Mutation {
    saveCampaign(input: JSON!): Campaign!
    saveCoupon(input: JSON!): Coupon!
    applyCoupon(code: String!): Cart!
  }
`;
