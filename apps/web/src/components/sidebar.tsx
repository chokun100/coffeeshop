"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Coffee,
  ClipboardList,
  FileText,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Square,
} from "lucide-react";
import { useStoreSettings } from "@/store/store-settings";

export default function Sidebar() {
  const { storeName } = useStoreSettings();
  const pathname = usePathname();

  const sections = [
    {
      title: "Main",
      items: [
        { href: "/", label: "POS", icon: Square },
        { href: "/orders", label: "Orders", icon: ClipboardList },
      ],
    },
    {
      title: "Offering",
      items: [{ href: "/invoices", label: "Invoices", icon: FileText }],
    },
    {
      title: "Back Office",
      items: [
        { href: "/users", label: "Users", icon: Users },
        { href: "/reports", label: "Reports", icon: BarChart3 },
        { href: "/settings", label: "Settings", icon: SettingsIcon },
      ],
    },
  ];

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-[--color-sidebar-border] bg-[--color-sidebar] text-[--color-sidebar-foreground]">
      <div className="p-4">
        <div className="flex items-center gap-3 text-2xl font-medium">
          <div className="size-6 rounded-md bg-amber-800 text-white inline-grid place-items-center">
            <Coffee className="size-4" />
          </div>
          <span>{storeName}</span>
        </div>
        <hr className="my-4 border-[--color-sidebar-border]" />

        <nav className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="px-3 text-sm font-medium text-[--color-muted-foreground]">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href as any}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-base transition-colors",
                        active
                          ? "bg-[--color-sidebar-accent] text-[--color-sidebar-accent-foreground]"
                          : "hover:bg-[--color-sidebar-accent] hover:text-[--color-sidebar-accent-foreground]"
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
