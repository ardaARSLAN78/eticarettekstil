export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
}
export interface SeoFields {
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
}
export interface Category extends SeoFields {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  parentId: string | null;
  active: boolean;
  sortOrder: number;
}
export interface Color {
  id: string;
  name: string;
  slug: string;
  hex: string;
  sortOrder: number;
}
export interface Size {
  id: string;
  label: string;
  code: string;
  group: string;
  sortOrder: number;
}
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
}
export interface Collection extends SeoFields {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  active: boolean;
  sortOrder: number;
}
export interface Variant {
  id: string;
  colorId: string;
  sizeId: string;
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  stock: number;
  version: number;
  active: boolean;
  barcode: string | null;
  price: number | null;
  lowStockThreshold: number;
}
export interface Product extends SeoFields {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  material: string;
  care: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  media: { id: string; url: string; alt: string; sortOrder: number; colorId: string | null }[];
  badge: string | null;
  active: boolean;
  featured: boolean;
  categoryId: string;
  category: Category;
  brandId: string | null;
  variants: Variant[];
  collections: Collection[];
  vatRateBps: number;
  weightGrams: number;
  ogImage: string | null;
}
export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pages: number;
}
export interface StoreSettings {
  brandName: string;
  logoUrl: string;
  monogramUrl: string;
  themeColor: string;
  allowIndexing: boolean;
  tagline: string;
  announcement: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  heroCta: string;
  editorialEyebrow: string;
  editorialTitle: string;
  editorialText: string;
  editorialImage: string;
  campaignTitle: string;
  campaignText: string;
  campaignImage: string;
  newsletterTitle: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  instagramUrl: string;
  googlePlaceId: string;
  showGoogleReviews: boolean;
  shippingFee: number;
  shippingVatRateBps: number;
  freeShippingThreshold: number;
  bankAccountName: string;
  bankIban: string;
  privacyText: string;
  returnsText: string;
  termsText: string;
}
export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  name: string;
  slug: string;
  image: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
}
export interface Cart {
  id: string;
  version: number;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingThreshold: number;
  discountAmount: number;
  taxAmount: number;
  couponCode: string | null;
  couponError: string | null;
  campaignName: string | null;
}
export interface OrderItem {
  id: string;
  name: string;
  image: string;
  color: string;
  size: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}
export interface Order {
  id: string;
  number: string;
  email: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentSandbox: boolean;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  items: OrderItem[];
  history: { status: string; note: string | null; createdAt: string }[];
}
export interface CustomerAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
}
export interface PaymentMethod {
  provider: string;
  label: string;
  sandbox: boolean;
}
export interface PaymentProviderConfig {
  provider: string;
  label: string;
  enabled: boolean;
  sandbox: boolean;
  configured: boolean;
  fields: { key: string; label: string; secret: boolean }[];
  presentFields: string[];
  callbackUrl: string;
}
export interface Coupon {
  id: string;
  code: string;
  campaignId: string;
  active: boolean;
  usageLimit: number | null;
}
export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  value: number;
  active: boolean;
  automatic: boolean;
  startsAt: string;
  endsAt: string;
  minimumSubtotal: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  perEmailLimit: number | null;
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  coupons: Coupon[];
}
export interface GoogleReviews {
  configured: boolean;
  available: boolean;
  rating: number | null;
  count: number;
  mapsUrl: string | null;
  message: string;
  reviews: {
    author: string;
    authorUrl: string | null;
    avatar: string | null;
    rating: number;
    text: string;
    publishedAt: string;
    sourceUrl: string | null;
    visitDate: string | null;
  }[];
}
export interface MediaAsset {
  id: string;
  url: string;
  alt: string;
  bytes: number;
  width: number;
  height: number;
}
