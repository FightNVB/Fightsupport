import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "FightSupport",
  description: "FightSupport – Vechtsport ondersteuning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body className="bg-black text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
