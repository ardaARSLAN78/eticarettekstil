export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Report {
  days: number;
  from: string;
  products: number;
  customers: number;
  subscribers: number;
  orders: number;
  revenue: number;
  shipping: number;
  discountAmount: number;
  taxAmount: number;
  activeCoupons: number;
  refunds: number;
  processing: number;
  timeline: { day: string; revenue: number; orders: number }[];
  statuses: { status: string; count: number }[];
  recentOrders: {
    id: string;
    number: string;
    customerName: string;
    email: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
  lowStock: {
    id: string;
    name: string;
    sku: string;
    color: string;
    size: string;
    stock: number;
    warehouse: string;
  }[];
  topProducts: { id: string; name: string; quantity: number; revenue: number }[];
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  disabled: boolean;
  createdAt: string;
  orders: number;
  totalSpent: number;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  active: boolean;
}

export interface InventoryRow {
  id: string;
  name: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  version: number;
  warehouseId: string;
  warehouse: string;
  active: boolean;
  lowStockThreshold: number;
}
