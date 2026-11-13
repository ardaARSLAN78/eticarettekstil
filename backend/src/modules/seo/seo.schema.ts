export const seoSchema = /* GraphQL */ `
  type SeoEntry {
    path: String!
    updatedAt: String!
    title: String
    description: String
    canonicalUrl: String
  }
  type Redirect {
    id: ID!
    fromPath: String!
    toPath: String!
  }
  extend type Query {
    seoEntries: [SeoEntry!]!
    resolveRedirect(path: String!): String
    adminRedirects: [Redirect!]!
  }
  extend type Mutation {
    saveRedirect(input: JSON!): Redirect!
  }
`;
