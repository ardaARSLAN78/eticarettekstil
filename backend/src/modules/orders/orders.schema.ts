export const ordersSchema = /* GraphQL */ `
  type OrderItem {
    id: ID!
    name: String!
    image: String!
    color: String!
    size: String!
    sku: String!
    unitPrice: Int!
    quantity: Int!
  }
  type Order {
    id: ID!
    number: String!
    email: String!
    customerName: String!
    phone: String!
    address: String!
    city: String!
    district: String!
    postalCode: String!
    subtotal: Int!
    discountAmount: Int!
    taxAmount: Int!
    shipping: Int!
    total: Int!
    status: String!
    paymentStatus: String!
    paymentProvider: String!
    paymentSandbox: Boolean!
    trackingNumber: String
    shippingCarrier: String
    invoiceNumber: String
    invoiceUrl: String
    createdAt: String!
    items: [OrderItem!]!
    history: [OrderHistory!]!
  }
  type OrderHistory {
    status: String!
    note: String
    createdAt: String!
  }
  type CheckoutResult {
    order: Order!
    receiptToken: String!
    paymentUrl: String
  }
  input CheckoutInput {
    idempotencyKey: String!
    email: String!
    customerName: String!
    phone: String!
    address: String!
    city: String!
    district: String!
    postalCode: String!
    paymentProvider: String!
    termsAccepted: Boolean!
    identityNumber: String
    billingDetails: JSON
  }
  extend type Query {
    myOrders: [Order!]!
    orderReceipt(token: String!): Order
    adminOrders(page: Int): [Order!]!
  }
  extend type Mutation {
    checkout(input: CheckoutInput!): CheckoutResult!
    updateOrderStatus(
      id: ID!
      status: String!
      trackingNumber: String
      shippingCarrier: String
    ): Order!
    updateInvoice(id: ID!, invoiceNumber: String!, invoiceUrl: String!): Order!
    retryPayment(token: String!): CheckoutResult!
  }
`;
