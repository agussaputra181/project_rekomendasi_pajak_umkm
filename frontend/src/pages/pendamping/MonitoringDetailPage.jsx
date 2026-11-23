// Detail satu UMKM untuk pendamping/admin (hanya baca): ringkasan, rekomendasi & progres saran, omzet.
import { Link, useParams } from "react-router-dom";
import useApi from "../../hooks/useApi";
import RevenueChart from "../../components/RevenueChart";
import ThresholdRuler from "../../components/ThresholdRuler";
import { Alert, ApplicableLabel, Loading, PageTitle, Panel, Section } from "../../components/ui";
import { ENTITY_LABEL, SECTOR_LABEL, TAX_LABEL, formatDate, formatRupiah } from "../../utils/format";

export default function MonitoringDetailPage() {
  const { id } = useParams();
  const business = useApi(`/businesses/${id}`);
  const dashboard = useApi(`/dashboard/umkm/${id}`);
  const rec = useApi(`/businesses/${id}/recommendations/latest`);

  const error = business.error || dashboard.error || rec.error;
  if (error) return <Alert>{error}</Alert>;
  if (!business.data || !dashboard.data || !rec.data) return <Loading />;
  const b = business.data;
  const d = dashboard.data;

  return (
    <>
      <Link to="/" className="mb-4 inline-block text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Kembali ke daftar</Link>
      <PageTitle note={`${ENTITY_LABEL[b.entityType]}, ${SECTOR_LABEL[b.sector]}, ${b.address?.city || "kota belum diisi"}. NPWP: ${b.hasNPWP ? b.npwp || "ada" : "belum"}.`}>{b.businessName}</PageTitle>

      <p className="mb-8 text-lg">Skema: <strong>{d.scheme.label}</strong>. Omzet tercatat {d.year}: <strong>{formatRupiah(d.revenue.cumulative)}</strong> ({d.revenue.monthsRecorded} bulan). Checklist: <strong>{d.checklist.done} dari {d.checklist.total}</strong>.</p>

      <Section title="Progres menuju batas">
        <div className="space-y-6">{d.thresholds.map((t) => <ThresholdRuler key={t.key} value={t.value} limit={t.limit} label={t.key === "ceiling" ? "Batas" : "Batas bebas"} />)}</div>
      </Section>

      <Section title="Omzet per bulan" className="mt-6"><Panel><RevenueChart months={d.revenue.months} /></Panel></Section>

      <Section title="Rekomendasi & saran" className="mt-6">
        <ul className="space-y-3">
          {rec.data.items.map((item) => {
            const done = item.actions.filter((a) => a.done).length;
            return (
              <li key={item._id} className="rounded-md bg-white p-5 ring-1 ring-line">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-bold">{item.code} {TAX_LABEL[item.taxType] || item.taxType}</p>
                  <ApplicableLabel applicable={item.applicable} />
                </div>
                <p className="mt-2 text-sm">{item.reason}</p>
                <p className="mt-2 text-sm text-ink-soft">Langkah selesai: {done} dari {item.actions.length}{item.nextDueDate ? `. Jatuh tempo berikutnya ${formatDate(item.nextDueDate)}` : ""}</p>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
