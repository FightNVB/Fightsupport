import { ReactNode } from "react";

interface NvbTableProps {
  columns: string[];
  children: ReactNode;

  // optioneel: als je een page ooit wél oranje header wil
  headerVariant?: "silver" | "orange";
  showAccentLine?: boolean;
}

export default function NvbTable({
  columns,
  children,
  headerVariant = "silver",
  showAccentLine = true,
}: NvbTableProps) {
  const theadClass =
    headerVariant === "orange"
      ? "bg-[#ff4d00] text-white"
      : "text-white";

  const theadStyle =
    headerVariant === "orange"
      ? undefined
      : ({
          background:
            "linear-gradient(180deg, rgba(245,245,245,0.26) 0%, rgba(160,160,160,0.10) 55%, rgba(0,0,0,0.15) 100%)",
        } as React.CSSProperties);

  return (
    <div className="overflow-x-auto w-full">
      <div className="rounded-2xl border border-white/10 bg-black/35 overflow-hidden">
        {/* subtiele oranje accentlijn (B-stijl) */}
        {showAccentLine ? <div className="h-[2px] bg-[#ff4d00]" /> : null}

        <table className="min-w-full border-collapse">
          <thead style={theadStyle}>
            <tr className={theadClass}>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className="py-3 px-4 text-left text-sm md:text-base font-semibold text-white/95"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className="
              [&>tr:nth-child(odd)]:bg-black
              [&>tr:nth-child(odd)]:text-white
              [&>tr:nth-child(even)]:bg-white
              [&>tr:nth-child(even)]:text-black
            "
          >
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}