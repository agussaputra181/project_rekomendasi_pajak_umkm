// Daftar batang horizontal sederhana untuk statistik monitoring (jumlah per kategori).
// Catatan: jangan menamai props "valueOf" karena bentrok dengan Object.prototype.valueOf.
export default function BarList({ rows, labelOf = (r) => r.label, countOf = (r) => r.count }) {
  const max = Math.max(1, ...rows.map(countOf));
  if (!rows.length) return <p className="text-sm text-ink-soft">Belum ada data.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={labelOf(row)} className="grid grid-cols-[minmax(8rem,12rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate">{labelOf(row)}</span>
          <span className="h-3 rounded-sm bg-paper">
            <span className="block h-full rounded-sm bg-tosca" style={{ width: `${(countOf(row) / max) * 100}%` }} />
          </span>
          <span className="text-right font-bold">{countOf(row)}</span>
        </li>
      ))}
    </ul>
  );
}
