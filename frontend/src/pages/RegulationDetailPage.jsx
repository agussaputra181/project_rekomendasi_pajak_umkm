import { Link, useParams } from "react-router-dom";
import useApi from "../hooks/useApi";
import { Alert, Loading, PageTitle, Panel } from "../components/ui";
import { REG_STATUS_LABEL, REG_TYPE_LABEL, formatDate } from "../utils/format";

export default function RegulationDetailPage() {
  const { id } = useParams();
  const { data: r, loading, error } = useApi(`/regulations/${id}`);
  if (loading && !r) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  return (
    <>
      <Link to="/pustaka" className="mb-4 inline-block text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Kembali ke pustaka</Link>
      <PageTitle note={r.title}>{r.number}</PageTitle>
      <Panel className="max-w-3xl">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-soft">Jenis</dt><dd className="font-semibold">{REG_TYPE_LABEL[r.type]}</dd></div>
          <div><dt className="text-ink-soft">Status</dt><dd className="font-semibold">{REG_STATUS_LABEL[r.status]}</dd></div>
          <div><dt className="text-ink-soft">Mulai berlaku</dt><dd className="font-semibold">{formatDate(r.effectiveDate)}</dd></div>
          <div><dt className="text-ink-soft">Jenis pajak terdampak</dt><dd className="font-semibold">{r.affectedTaxTypes?.join(", ") || "-"}</dd></div>
          {r.region && <div><dt className="text-ink-soft">Daerah</dt><dd className="font-semibold">{r.region}</dd></div>}
          {r.replacedBy && <div><dt className="text-ink-soft">Diubah/diganti oleh</dt><dd><Link to={`/pustaka/regulasi/${r.replacedBy._id}`} className="font-semibold text-tosca-dark underline">{r.replacedBy.number}</Link></dd></div>}
        </dl>
        <h2 className="mt-6 font-bold">Ringkasan</h2>
        <p className="mt-2 leading-relaxed">{r.summaryPlain}</p>
        {r.tags?.length > 0 && <p className="mt-4 text-sm text-ink-soft">Kata kunci: {r.tags.join(", ")}</p>}
        {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-tosca-dark underline">Buka sumber resmi</a>}
      </Panel>
    </>
  );
}
