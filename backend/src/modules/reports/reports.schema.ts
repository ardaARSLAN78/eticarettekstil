export const reportsSchema = /* GraphQL */ `
  extend type Query {
    adminReports(days: Int): JSON!
  }
`;
