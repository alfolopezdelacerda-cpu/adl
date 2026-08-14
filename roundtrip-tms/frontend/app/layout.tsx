import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Roundtrip TMS",
  description: "Gestión de viajes redondos: viajes, unidades y operadores.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <StoreProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
            <Nav />
            <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
            <footer className="px-4 pb-8 pt-4 text-xs text-muted sm:px-6">
              Roundtrip TMS · MVP con datos demo (se guardan en este navegador).
            </footer>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
