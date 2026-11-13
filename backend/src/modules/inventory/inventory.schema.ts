export const inventorySchema = /* GraphQL */ `
  extend type Query {
    adminInventory(filter: JSON): JSON!
    adminWarehouses: JSON!
  }
  extend type Mutation {
    updateInventory(input: JSON!): Boolean!
    saveWarehouse(input: JSON!): Boolean!
  }
`;
