export const usersSchema = /* GraphQL */ `
  extend type Query {
    adminUsers(filter: JSON): JSON!
  }
  extend type Mutation {
    createStaff(input: JSON!): Boolean!
    updateUserAccess(input: JSON!): Boolean!
  }
`;
