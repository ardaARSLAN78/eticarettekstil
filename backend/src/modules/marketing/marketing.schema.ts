export const marketingSchema = /* GraphQL */ `
  extend type Query {
    adminSubscribers(filter: JSON): JSON!
  }
  extend type Mutation {
    disableSubscriber(id: ID!): Boolean!
    unsubscribeNewsletter(token: String!): Boolean!
  }
`;
