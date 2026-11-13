export const accountSchema = /* GraphQL */ `
  type CustomerAddress {
    id: ID!
    label: String!
    fullName: String!
    phone: String!
    address: String!
    city: String!
    district: String!
    postalCode: String!
    countryCode: String!
    isDefault: Boolean!
  }
  extend type Query {
    myAddresses: [CustomerAddress!]!
  }
  extend type Mutation {
    saveAddress(input: JSON!): CustomerAddress!
    deleteAddress(id: ID!): Boolean!
  }
`;
