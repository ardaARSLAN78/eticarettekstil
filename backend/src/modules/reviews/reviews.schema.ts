export const reviewsSchema = /* GraphQL */ `
  type GoogleReview {
    author: String!
    authorUrl: String
    avatar: String
    rating: Float!
    text: String!
    publishedAt: String!
    sourceUrl: String
    visitDate: String
  }
  type GoogleReviews {
    configured: Boolean!
    available: Boolean!
    rating: Float
    count: Int!
    mapsUrl: String
    reviews: [GoogleReview!]!
    message: String!
  }
  extend type Query {
    googleReviews: GoogleReviews!
    adminGoogleIntegration: JSON!
  }
  extend type Mutation {
    saveGoogleIntegration(input: JSON!): Boolean!
  }
`;
