export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  category?: Category;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  compare_at_price: number | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  continue_selling_when_out_of_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  print_time_hours: number | null;
  weight_oz: number | null;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_adjustment: number;
  stock_quantity: number;
  display_order: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export interface Address {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface SavedAddress extends Address {
  id: string;
  user_id: string;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: number;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  shipping_address: Address;
  billing_address: Address | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface QuoteRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  description: string;
  reference_images: string[];
  status: QuoteStatus;
  quoted_price: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type QuoteStatus = 'pending' | 'quoted' | 'accepted' | 'declined';

export interface Profile {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  contact_email: string | null;
  default_shipping_cost: number;
  low_stock_threshold: number;
  updated_at: string;
}

export interface InventoryAdjustment {
  id: string;
  product_id: string;
  variant_id: string | null;
  previous_quantity: number;
  new_quantity: number;
  adjustment: number;
  reason: 'sale' | 'restock' | 'damage' | 'manual' | 'return';
  order_id: string | null;
  admin_user_id: string | null;
  created_at: string;
}
