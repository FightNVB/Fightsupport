import Link from "next/link";

export default function SportscholenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Link
        href="/dashboard/sportscholen/vechters/toevoegen"
        className="fixed bottom-5 right-5 z-50 border border-[#ff4d00] bg-[#ff4d00] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] !text-black shadow-2xl shadow-black/60 hover:brightness-110"
      >
        + Vechter toevoegen
      </Link>
    </>
  );
}
