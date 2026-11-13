export const catalogSchema = /* GraphQL */ `
  type Category {
    id: ID!
    slug: String!
    name: String!
    image: String!
    sortOrder: Int!
    description: String!
    parentId: ID
    active: Boolean!
    seoTitle: String
    seoDescription: String
    canonicalUrl: String
    noIndex: Boolean!
  }
  type ProductImage {
    id: ID!
    url: String!
    alt: String!
    sortOrder: Int!
    colorId: ID
  }
  type Variant {
    id: ID!
    colorId: ID!
    sizeId: ID!
    color: String!
    colorHex: String!
    size: String!
    sku: String!
    barcode: String
    price: Int
    lowStockThreshold: Int!
    stock: Int!
    active: Boolean!
    version: Int!
  }
  type Product {
    id: ID!
    slug: String!
    name: String!
    subtitle: String!
    description: String!
    material: String!
    care: String!
    price: Int!
    compareAtPrice: Int
    images: [String!]!
    badge: String
    active: Boolean!
    featured: Boolean!
    categoryId: ID!
    category: Category!
    variants: [Variant!]!
    media: [ProductImage!]!
    brandId: ID
    brand: Brand
    collections: [Collection!]!
    seoTitle: String
    seoDescription: String
    canonicalUrl: String
    noIndex: Boolean!
    ogImage: String
    vatRateBps: Int!
    weightGrams: Int!
  }
  type ProductPage {
    items: [Product!]!
    total: Int!
    page: Int!
    pages: Int!
  }
  input ProductFilter {
    category: String
    collection: String
    search: String
    featured: Boolean
    sort: String
    page: Int
    limit: Int
  }
  extend type Query {
    categories: [Category!]!
    products(filter: ProductFilter): ProductPage!
    product(slug: String!): Product
    adminProducts(filter: ProductFilter): ProductPage!
  }
  extend type Mutation {
    saveCategory(input: JSON!): Category!
    deleteCategory(id: ID!): Boolean!
    saveProduct(input: JSON!): Product!
    archiveProduct(id: ID!): Boolean!
  }
`;
