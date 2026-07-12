interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
    </div>
  );
}
