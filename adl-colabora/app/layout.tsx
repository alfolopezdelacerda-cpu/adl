import "./globals.css";

export const metadata = {
  title: "ADL Colabora",
  description: "Panel colaborativo ADL: tareas, minutas, calendario y colaboradores.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
