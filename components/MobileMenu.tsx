"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, Settings, Shield } from "lucide-react";

export default function MobileMenu() {
  const pathname = usePathname();

  // Controle: enkel tonen op mobiel
  return (
    <nav
      className="mobile-only fixed bottom-0 left-0 right-0 bg-black border-t border-[#ff4d00]
                 flex justify-around items-center py-2 z-50"
      style={{
        boxShadow: "0 -2px 8px rgba(255, 77, 0, 0.25)",
      }}
    >
      {[
        { href: "/dashboard", icon: <Home size={22} />, label: "Dashboard" },
        { href: "/evenementen", icon: <CalendarDays size={22} />, label: "Evenementen" },
        { href: "/officials", icon: <Shield size={22} />, label: "Officials" },
        { href: "/gebruikers", icon: <Users size={22} />, label: "Gebruikers" },
        { href: "/instellingen", icon: <Settings size={22} />, label: "Instellingen" },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center text-xs ${
            pathname === item.href ? "text-[#ff4d00]" : "text-white"
          }`}
        >
          {item.icon}
          <span className="mt-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
