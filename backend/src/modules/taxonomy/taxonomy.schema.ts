export const taxonomySchema = /* GraphQL */ `
  type Color {
    id: ID!
    name: String!
    slug: String!
    hex: String!
    sortOrder: Int!
  }
  type Size {
    id: ID!
    label: String!
    code: String!
    group: String!
    sortOrder: Int!
  }
  type Brand {
    id: ID!
    name: String!
    slug: String!
    description: String!
    logo: String
  }
  type Collection {
    id: ID!
    name: String!
    slug: String!
    description: String!
    image: String!
    active: Boolean!
    sortOrder: Int!
    seoTitle: String
    seoDescription: String
    canonicalUrl: String
    noIndex: Boolean!
  }
  extend type Query {
    colors: [Color!]!
    sizes: [Size!]!
    brands: [Brand!]!
    collections: [Collection!]!
  }
  extend type Mutation {
    saveColor(input: JSON!): Color!
    saveSize(input: JSON!): Size!
    saveBrand(input: JSON!): Brand!
    saveCollection(input: JSON!): Collection!
  }
`;
