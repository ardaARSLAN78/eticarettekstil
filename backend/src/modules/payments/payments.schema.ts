export const paymentsSchema = /* GraphQL */ `
  type CredentialField {
    key: String!
    label: String!
    secret: Boolean!
  }
  type PaymentProviderConfig {
    provider: String!
    label: String!
    enabled: Boolean!
    sandbox: Boolean!
    configured: Boolean!
    fields: [CredentialField!]!
    presentFields: [String!]!
    callbackUrl: String!
  }
  type PaymentMethod {
    provider: String!
    label: String!
    sandbox: Boolean!
  }
  extend type Query {
    paymentMethods: [PaymentMethod!]!
    adminPaymentProviders: [PaymentProviderConfig!]!
  }
  extend type Mutation {
    savePaymentProvider(input: JSON!): Boolean!
  }
`;
