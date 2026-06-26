"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/uebersicht", label: "Übersicht" },
  { href: "/dashboard/clients", label: "Kunden" },
  { href: "/dashboard/themenpool", label: "Themenpool" },
  { href: "/dashboard/campaigns", label: "Kampagnen" },
  { href: "/dashboard/media-contacts", label: "Medienkontakte" },
  { href: "/dashboard/outreach", label: "Outreach" },
  { href: "/dashboard/follow-ups", label: "Follow-ups" },
  { href: "/dashboard/settings", label: "Einstellungen" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
