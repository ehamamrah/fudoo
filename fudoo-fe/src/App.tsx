import { NavLink, Route, Routes } from "react-router-dom";
import { routes } from "./routes";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm ${isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-200"}`;

function Nav() {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white px-4 py-2">
      <span className="mr-4 font-bold">Fudoo</span>
      {routes.filter((route) => route.label).map((route) => (
        <NavLink key={route.path} to={route.path} end={route.path === "/"} className={linkClass}>
          {route.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl p-4">
        <Routes>
          {routes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}
        </Routes>
      </main>
    </div>
  );
}
