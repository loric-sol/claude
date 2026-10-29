"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chart, Home, ImageIcon, LinkIcon, List, Message, Palette, User } from "../icons";

export const NAV = [
  { href: "/dashboard", label: "Overview", Icon: Home },
  { href: "/dashboard/services", label: "Services", Icon: List },
  { href: "/dashboard/links", label: "Booking & links", Icon: LinkIcon },
  { href: "/dashboard/profile", label: "Profile", Icon: User },
  { href: "/dashboard/appearance", label: "Appearance", Icon: Palette },
  { href: "/dashboard/gallery", label: "Gallery", Icon: ImageIcon },
  { href: "/dashboard/content", label: "Reviews & policies", Icon: Message },
  { href: "/dashboard/analytics", label: "Analytics", Icon: Chart },
];

const isActive = (path: string, href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="space-y-0.5">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-surface font-medium text-ink shadow-soft" : "text-muted hover:bg-surface/60 hover:text-ink"}`}
          >
            <Icon width={18} height={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1.5 pb-1">
        {NAV.map(({ href, label }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition ${active ? "bg-ink text-page" : "bg-surface text-muted"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
