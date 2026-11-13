export const mediaSchema = /* GraphQL */ `
  type MediaAsset {
    id: ID!
    url: String!
    alt: String!
    mimeType: String!
    bytes: Int!
    width: Int!
    height: Int!
  }

  extend type Query {
    adminMedia(page: Int): [MediaAsset!]!
  }

  extend type Mutation {
    updateMediaAlt(id: ID!, alt: String!): MediaAsset!
  }
`;
