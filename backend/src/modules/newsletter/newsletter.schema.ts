export const newsletterSchema = /* GraphQL */ `
  extend type Mutation {
    subscribeNewsletter(email: String!, consent: Boolean!): Boolean!
  }
`;
