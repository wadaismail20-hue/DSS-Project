import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSS Product Discovery | Unified Product OS",
  description: "PT. Dian Swastatika Sentosa, Tbk - Enterprise strategic product discovery & agile delivery platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
