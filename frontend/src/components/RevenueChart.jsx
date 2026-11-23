// Grafik omzet per bulan (batang) dan estimasi PPh Final per bulan (garis).
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { formatRupiah, MONTHS } from "../utils/format";

// Warna diambil dari @theme di index.css agar grafik ikut berubah bila tema diganti
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const shortAxis = (n) => (n >= 1e9 ? `${n / 1e9} M` : n >= 1e6 ? `${n / 1e6} jt` : n >= 1e3 ? `${n / 1e3} rb` : `${n}`);

// months: [{ month, amount, estimatedTax }]
export default function RevenueChart({ months, showTax = true }) {
  const data = months.map((m) => ({ bulan: MONTHS[m.month - 1].slice(0, 3), omzet: m.amount ?? 0, pajak: m.estimatedTax ?? null }));
  const hasTax = showTax && data.some((d) => d.pajak > 0); // garis pajak hanya bila ada pajak terutang
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: hasTax ? 8 : 0, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={css("--color-line")} vertical={false} />
          <XAxis dataKey="bulan" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: css("--color-ink-soft") }} />
          <YAxis yAxisId="omzet" tickFormatter={shortAxis} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 12, fill: css("--color-ink-soft") }} />
          {hasTax && <YAxis yAxisId="pajak" orientation="right" tickFormatter={shortAxis} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 12, fill: css("--color-warn") }} />}
          <Tooltip formatter={(v, name) => [formatRupiah(v), name]} cursor={{ fill: css("--color-tosca-wash") }} />
          {hasTax && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Bar yAxisId="omzet" dataKey="omzet" name="Omzet" fill={css("--color-ink")} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          {hasTax && <Line yAxisId="pajak" dataKey="pajak" name="Estimasi PPh Final" stroke={css("--color-warn")} strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
