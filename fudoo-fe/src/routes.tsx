import type { ReactNode } from "react";
import { IngredientsPage } from "./features/ingredients/IngredientsPage";
import { MenuItemsPage } from "./features/menu-items/MenuItemsPage";
import { PurchaseOrderDetailPage } from "./features/purchase-orders/PurchaseOrderDetailPage";
import { PurchaseOrdersPage } from "./features/purchase-orders/PurchaseOrdersPage";
import { PosPage } from "./features/sales/PosPage";
import { StockPage } from "./features/stock/StockPage";
import { SuppliersPage } from "./features/suppliers/SuppliersPage";

export interface AppRoute {
  path: string;
  label?: string;
  element: ReactNode;
}

export const routes: AppRoute[] = [
  { path: "/", label: "Stock", element: <StockPage /> },
  { path: "/ingredients", label: "Ingredients", element: <IngredientsPage /> },
  { path: "/suppliers", label: "Suppliers", element: <SuppliersPage /> },
  { path: "/menu-items", label: "Menu items", element: <MenuItemsPage /> },
  { path: "/purchase-orders", label: "Purchase orders", element: <PurchaseOrdersPage /> },
  { path: "/purchase-orders/:id", element: <PurchaseOrderDetailPage /> },
  { path: "/pos", label: "POS", element: <PosPage /> },
];
