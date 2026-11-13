export const categoryFields =
  "id name slug image description parentId active sortOrder seoTitle seoDescription canonicalUrl noIndex";
export const collectionFields =
  "id name slug description image active sortOrder seoTitle seoDescription canonicalUrl noIndex";
export const productFields = `
  id name slug subtitle description material care price compareAtPrice images badge active featured categoryId brandId
  seoTitle seoDescription canonicalUrl noIndex ogImage vatRateBps weightGrams
  media { id url alt sortOrder colorId }
  category { ${categoryFields} }
  collections { ${collectionFields} }
  variants { id colorId sizeId color colorHex size sku stock version active barcode price lowStockThreshold }
`;
export const cartFields = `id version itemCount subtotal shipping total freeShippingThreshold discountAmount taxAmount couponCode couponError campaignName
  items { id variantId quantity name slug image color colorHex size stock unitPrice lineTotal available }`;
export const orderFields = `id number email customerName phone address city district postalCode subtotal discountAmount taxAmount shipping total status paymentStatus paymentProvider paymentSandbox trackingNumber shippingCarrier invoiceNumber invoiceUrl createdAt
  items { id name image color size sku unitPrice quantity }
  history { status note createdAt }`;
export const bootstrapQuery = `{ settings categories { ${categoryFields} } collections { ${collectionFields} } }`;
export const productsQuery = `query($filter:ProductFilter) { products(filter:$filter) { total page pages items { ${productFields} } } }`;
export const cartQuery = `{ cart { ${cartFields} } }`;
