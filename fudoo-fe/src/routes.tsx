import { lazy, type ComponentType, type ReactNode } from "react";
import type { IconName } from "./components/Icon";

function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

const StockPage = lazyPage(() => import("./features/stock/StockPage"), "StockPage");
const PurchaseOrdersPage = lazyPage(() => import("./features/purchase-orders/PurchaseOrdersPage"), "PurchaseOrdersPage");
const PurchaseOrderDetailPage = lazyPage(() => import("./features/purchase-orders/PurchaseOrderDetailPage"), "PurchaseOrderDetailPage");
const PosPage = lazyPage(() => import("./features/sales/PosPage"), "PosPage");
const IngredientsPage = lazyPage(() => import("./features/ingredients/IngredientsPage"), "IngredientsPage");
const SuppliersPage = lazyPage(() => import("./features/suppliers/SuppliersPage"), "SuppliersPage");
const MenuItemsPage = lazyPage(() => import("./features/menu-items/MenuItemsPage"), "MenuItemsPage");
const AddOnsPage = lazyPage(() => import("./features/add-ons/AddOnsPage"), "AddOnsPage");

export const SECTIONS = ["Overview", "Catalog", "Operations"] as const;

interface AppRoute {
  path: string;
  element: ReactNode;
  nav?: { label: string; icon: IconName; section: (typeof SECTIONS)[number] };
}

export const routes: AppRoute[] = [
  { path: "/", element: <StockPage />, nav: { label: "Stock", icon: "stock", section: "Overview" } },
  { path: "/ingredients", element: <IngredientsPage />, nav: { label: "Ingredients", icon: "ingredients", section: "Catalog" } },
  { path: "/suppliers", element: <SuppliersPage />, nav: { label: "Suppliers", icon: "suppliers", section: "Catalog" } },
  { path: "/menu-items", element: <MenuItemsPage />, nav: { label: "Menu items", icon: "menu", section: "Catalog" } },
  { path: "/add-ons", element: <AddOnsPage />, nav: { label: "Add-ons", icon: "addOns", section: "Catalog" } },
  { path: "/purchase-orders", element: <PurchaseOrdersPage />, nav: { label: "Purchase orders", icon: "orders", section: "Operations" } },
  { path: "/purchase-orders/:id", element: <PurchaseOrderDetailPage /> },
  { path: "/pos", element: <PosPage />, nav: { label: "POS Simulator", icon: "pos", section: "Operations" } },
];
