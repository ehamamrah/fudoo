import { Suspense } from "react";
import { NavLink, Route, Routes } from "react-router";
import { Icon } from "./components/Icon";
import { Loading } from "./components/QueryState";
import { routes, SECTIONS } from "./routes";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
  (isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white");

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-brand-400 to-brand-600 text-lg font-bold text-white shadow-lg shadow-brand-500/30">
        F
      </span>
      <div className="leading-tight">
        <p className="font-semibold text-white">Fudoo</p>
        <p className="hidden text-xs text-slate-400 lg:block">Inventory &amp; purchasing</p>
      </div>
    </div>
  );
}

function NavSection({ section }: { section: (typeof SECTIONS)[number] }) {
  return (
    <div className="contents lg:mt-6 lg:flex lg:flex-col lg:gap-1">
      <p className="hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:block">{section}</p>
      {routes.filter((route) => route.nav?.section === section).map(({ path, nav }) => (
        <NavLink key={path} to={path} end={path === "/"} className={linkClass}>
          {nav && <Icon name={nav.icon} />}
          {nav?.label}
        </NavLink>
      ))}
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 z-20 flex flex-col gap-3 bg-slate-900 px-3 py-3 lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:px-4 lg:py-6">
      <Brand />
      <nav aria-label="Main" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 lg:block">
        {SECTIONS.map((section) => <NavSection key={section} section={section} />)}
      </nav>
      <p className="mt-auto hidden px-3 text-xs text-slate-500 lg:block">Single branch · live every 5s</p>
    </aside>
  );
}

export default function App() {
  return (
    <div className="min-h-screen lg:pl-64">
      <Sidebar />
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Suspense fallback={<Loading />}>
          <Routes>
            {routes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
