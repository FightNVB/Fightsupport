"use client";

export default function DarkCardCompact({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-xl mx-auto mt-10 p-6 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] shadow-lg shadow-black/40">
      <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-400 mb-6">{subtitle}</p>
      )}

      <div>{children}</div>
    </div>
  );
}
