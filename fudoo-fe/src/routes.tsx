import type { ReactNode } from "react";
import type { IconName } from "./components/Icon";
import { IngredientsPage } from "./features/ingredients/IngredientsPage";
import { MenuItemsPage } from "./features/menu-items/MenuItemsPage";
import { PurchaseOrderDetailPage } from "./features/purchase-orders/PurchaseOrderDetailPage";
import { PurchaseOrdersPage } from "./features/purchase-orders/PurchaseOrdersPage";
import { PosPage } from "./features/sales/PosPage";
import { StockPage } from "./features/stock/StockPage";
import { SuppliersPage } from "./features/suppliers/SuppliersPage";

export const SECTIONS = ["Overview", "Operations", "Catalog"] as const;

export interface AppRoute {
  path: string;
  element: ReactNode;
  nav?: { label: string; icon: IconName; section: (typeof SECTIONS)[number] };
}

export const routes: AppRoute[] = [
  { path: "/", element: <StockPage />, nav: { label: "Stock", icon: "stock", section: "Overview" } },
  { path: "/purchase-orders", element: <PurchaseOrdersPage />, nav: { label: "Purchase orders", icon: "orders", section: "Operations" } },
  { path: "/purchase-orders/:id", element: <PurchaseOrderDetailPage /> },
  { path: "/pos", element: <PosPage />, nav: { label: "POS", icon: "pos", section: "Operations" } },
  { path: "/ingredients", element: <IngredientsPage />, nav: { label: "Ingredients", icon: "ingredients", section: "Catalog" } },
  { path: "/suppliers", element: <SuppliersPage />, nav: { label: "Suppliers", icon: "suppliers", section: "Catalog" } },
  { path: "/menu-items", element: <MenuItemsPage />, nav: { label: "Menu items", icon: "menu", section: "Catalog" } },
];
