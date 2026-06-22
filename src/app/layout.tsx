import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "PR-Agent",
  description: "SaaS-Plattform für PR-Agenturen und Kommunikationsteams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
