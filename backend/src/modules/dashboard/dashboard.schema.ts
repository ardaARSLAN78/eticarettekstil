export const dashboardSchema = /* GraphQL */ `
  extend type Query {
    adminDashboard: JSON!
    adminAuditLogs(page: Int): JSON!
    inventoryMovements(variantId: ID!, page: Int): JSON!
  }
`;
