export const settingsSchema = /* GraphQL */ `
  extend type Query {
    settings: JSON!
  }
  extend type Mutation {
    updateSettings(input: JSON!): JSON!
  }
`;
