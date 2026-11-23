// "Penggaris batas omzet": seberapa jauh omzet dari sebuah batas (Rp500 juta atau Rp4,8 miliar).
import { formatRupiahShort } from "../utils/format";

export default function ThresholdRuler({ value, limit, label }) {
  const max = Math.max(limit * 1.2, value * 1.05);
  const pct = (n) => `${Math.min(100, (n / max) * 100)}%`;
  const under = Math.min(value, limit);
  const over = Math.max(0, value - limit);
  const warning = value >= 0.8 * limit;

  return (
    <figure aria-label={`${label}: ${formatRupiahShort(value)} dari ${formatRupiahShort(limit)}`}>
      <div className="relative mb-2 h-6 text-sm">
        <span className="absolute whitespace-nowrap font-bold" style={{ left: pct(value), transform: `translateX(${value / max > 0.5 ? "-100%" : "0"})` }}>
          {formatRupiahShort(value)}
        </span>
      </div>
      <div className="relative h-4 rounded-sm bg-white ring-1 ring-line">
        <div className={`absolute inset-y-0 left-0 rounded-l-sm ${warning ? "bg-warn" : "bg-tosca"}`} style={{ width: pct(under) }} />
        {over > 0 && <div className="absolute inset-y-0 bg-due" style={{ left: pct(limit), width: pct(over) }} />}
        <div className="absolute -bottom-2 -top-2 w-0.5 bg-ink" style={{ left: pct(limit) }} />
      </div>
      <figcaption className="relative mt-3 h-10 text-sm">
        <span className="absolute left-0 text-ink-soft">Rp0</span>
        <span className="absolute whitespace-nowrap font-semibold" style={{ left: pct(limit), transform: `translateX(${limit / max > 0.6 ? "-100%" : "-50%"})` }}>
          {label} {formatRupiahShort(limit)}
        </span>
      </figcaption>
    </figure>
  );
}
