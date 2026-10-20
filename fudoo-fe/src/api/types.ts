export type Quantity = string;
export type Unit = "g" | "ml" | "pcs";
export const UNITS: Unit[] = ["g", "ml", "pcs"];

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Option {
  id: number;
  name: string;
}

export interface IngredientOption extends Option {
  unit: Unit;
}

export interface CatalogParams {
  page: number;
  search: string;
}

export interface IngredientParams extends CatalogParams {
  outOfStock: boolean;
}

export interface IngredientSummary {
  total: number;
  in_stock: number;
  out_of_stock: number;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: Unit;
  on_hand: Quantity;
  out_of_stock: boolean;
}

export interface IngredientInput {
  name: string;
  unit: Unit;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  ingredients: number[];
  supplies: Option[];
}

export interface SupplierInput {
  name: string;
  contact: string;
  ingredients: number[];
}

export interface RecipeLine {
  ingredient: number;
  ingredient_name: string;
  unit: Unit;
  quantity: Quantity;
}

export interface RecipeItem {
  id: number;
  name: string;
  recipe: RecipeLine[];
}

export interface RecipeItemInput {
  name: string;
  recipe: { ingredient: number; quantity: Quantity }[];
}

export type MenuItem = RecipeItem;
export type MenuItemInput = RecipeItemInput;
export type AddOn = RecipeItem;
export type AddOnInput = RecipeItemInput;

export type PurchaseOrderStatus = "draft" | "sent" | "received" | "closed" | "cancelled";
export type PurchaseOrderAction = "send" | "cancel" | "close";
export type PurchaseOrderFilter = "all" | "open";

export interface PurchaseOrderLine {
  id: number;
  ingredient: number;
  ingredient_name: string;
  unit: Unit;
  quantity_ordered: Quantity;
  quantity_received: Quantity;
  quantity_outstanding: Quantity;
}

export interface PurchaseOrder {
  id: number;
  supplier: number;
  supplier_name: string;
  status: PurchaseOrderStatus;
  created_at: string;
  lines: PurchaseOrderLine[];
  allowed_actions: PurchaseOrderAction[];
  can_receive: boolean;
}

export interface PurchaseOrderInput {
  request_id: string;
  supplier: number;
  lines: { ingredient: number; quantity_ordered: Quantity }[];
}

export interface DeliveryInput {
  request_id: string;
  lines: { line: number; quantity: Quantity }[];
}

export interface Sale {
  id: number;
  external_id: string;
  menu_item: number;
  menu_item_name: string;
  quantity: number;
  sold_at: string;
}

export interface SaleInput {
  external_id: string;
  menu_item: number;
  quantity: number;
}

export interface Shortage {
  ingredient: number;
  name: string;
  required: Quantity;
  available: Quantity;
}
