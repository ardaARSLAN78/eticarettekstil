export const cartsSchema = /* GraphQL */ `
  type CartItem {
    id: ID!
    variantId: ID!
    quantity: Int!
    name: String!
    slug: String!
    image: String!
    color: String!
    colorHex: String!
    size: String!
    stock: Int!
    unitPrice: Int!
    lineTotal: Int!
    available: Boolean!
  }
  type Cart {
    id: ID!
    version: Int!
    items: [CartItem!]!
    itemCount: Int!
    subtotal: Int!
    shipping: Int!
    total: Int!
    freeShippingThreshold: Int!
    discountAmount: Int!
    taxAmount: Int!
    couponCode: String
    couponError: String
    campaignName: String
  }
  extend type Query {
    cart: Cart!
  }
  extend type Mutation {
    setCartItem(variantId: ID!, quantity: Int!, expectedVersion: Int): Cart!
    adjustCartItem(variantId: ID!, delta: Int!): Cart!
  }
`;
