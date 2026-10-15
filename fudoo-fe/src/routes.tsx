import type { ReactNode } from "react";
import { Page } from "./components/Page";
import { IngredientsPage } from "./features/ingredients/IngredientsPage";
import { SuppliersPage } from "./features/suppliers/SuppliersPage";

export interface AppRoute {
  path: string;
  label?: string;
  element: ReactNode;
}

export const routes: AppRoute[] = [
  { path: "/", label: "Stock", element: <Page title="Stock">Coming soon.</Page> },
  { path: "/ingredients", label: "Ingredients", element: <IngredientsPage /> },
  { path: "/suppliers", label: "Suppliers", element: <SuppliersPage /> },
];
