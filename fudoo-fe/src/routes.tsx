import type { ReactNode } from "react";
import { Page } from "./components/Page";

export interface AppRoute {
  path: string;
  label?: string;
  element: ReactNode;
}

export const routes: AppRoute[] = [
  { path: "/", label: "Stock", element: <Page title="Stock">Coming soon.</Page> },
];
