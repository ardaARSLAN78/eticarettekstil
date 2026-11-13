export const commonSchema = /* GraphQL */ `
  scalar JSON
  type Query {
    health: String!
  }
  type Mutation {
    _version: String!
  }
`;
