"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, ReactNode } from "react";
import DarkCardLayout from "@/components/DarkCardLayout";

interface MenuButton {
  label: string;
  path: string;
}

interface MenuTemplateProps {
  title: string;
  subtitle?: string;
  allowedRoles: string[];
  buttons?: MenuButton[];
  showBackButton?: boolean;
  theme?: "light" | "dark"; // ✅ donker of licht
  children?: ReactNode; // ✅ toegevoegd
}

export default function MenuTemplate({
  title,
  subtitle,
  allowedRoles,
  buttons = [],
  showBackButton = true,
  theme = "dark",
  children, // ✅
}: MenuTemplateProps) {
  const router = useRouter();
  const { user, roles } = useAuth();

  // ✅ Redirect als niet ingelogd
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // ✅ Redirect bij geen juiste rol
  useEffect(() => {
    if (user && roles) {
      const heeftToegang = roles.some((r) => allowedRoles.includes(r as string));
      if (!heeftToegang) router.push("/dashboard");
    }
  }, [roles, user, router, allowedRoles]);

  if (!user) return null;

  // === Knoppen weergeven ===
  const renderButtons = () => (
    <>
      {buttons.map((btn, index) => (
        <button
          key={index}
          className="btn btn-primary"
          onClick={() => {
            if (btn.label.toLowerCase().includes("uitloggen")) {
              supabase.auth.signOut().then(() => router.push("/login"));
            } else if (btn.path !== "#") {
              if (btn.path.startsWith("http")) {
                window.open(btn.path, "_blank");
              } else {
                router.push(btn.path);
              }
            }
          }}
        >
          {btn.label}
        </button>
      ))}

      {showBackButton && (
        <button
          className="btn btn-outline mt-2"
          onClick={() => router.push("/dashboard")}
        >
          ← Terug naar Dashboard
        </button>
      )}
    </>
  );

  // === Footer ===
  const renderFooter = () => (
    <p
      className={`mt-4 text-center text-sm ${
        theme === "light" ? "text-gray-500" : "text-gray-400"
      }`}
    >
      Ingelogd als{" "}
      <strong>{user?.full_name || user?.email || "Onbekend"}</strong> ·{" "}
      {roles?.join(", ").toUpperCase()}
    </p>
  );

  // === Hoofdweergave ===
  return (
    <main className="login-wrap animate-fade-in">
      {theme === "light" ? (
        <LightCardLayout title={title} subtitle={subtitle}>
          {/* ✅ Eerst de children (zoals formulieren of lijsten) */}
          {children}
          {/* ✅ Daarna eventuele knoppen */}
          {buttons.length > 0 && renderButtons()}
          {renderFooter()}
        </LightCardLayout>
      ) : (
        <DarkCardLayout title={title} subtitle={subtitle}>
          {children}
          {buttons.length > 0 && renderButtons()}
          {renderFooter()}
        </DarkCardLayout>
      )}
    </main>
  );
}
