export const customersSchema = /* GraphQL */ `
  extend type Query {
    adminCustomers(filter: JSON): JSON!
    adminCustomer(id: ID!): JSON
  }
`;
