export const authSchema = /* GraphQL */ `
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }
  input LoginInput {
    email: String!
    password: String!
  }
  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }
  extend type Query {
    me: User
  }
  extend type Mutation {
    login(input: LoginInput!): User!
    register(input: RegisterInput!): User!
    logout: Boolean!
  }
`;
