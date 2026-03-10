export default function DispensatieStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-orange-100 text-orange-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    tied: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold ${map[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}
