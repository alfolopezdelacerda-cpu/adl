"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Tablero" },
  { href: "/viajes", label: "Viajes" },
  { href: "/unidades", label: "Unidades" },
  { href: "/operadores", label: "Operadores" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink text-[#F2F3EF]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Roundtrip <span className="text-amber">TMS</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const activo =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  activo
                    ? "bg-white/15 font-medium text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/viajes/nuevo"
          className="ml-auto rounded-md bg-amber px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo viaje
        </Link>
      </div>
    </header>
  );
}
