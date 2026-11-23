// Rekomendasi pajak & checklist saran (SRS FR-006, FR-007): pajak berlaku/tidak, alasan, nominal,
// jatuh tempo, dasar aturan, dan langkah yang bisa ditandai selesai.
import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import useApi from "../hooks/useApi";
import useCurrentBusiness from "../hooks/useCurrentBusiness";
import { useToast } from "../context/ToastContext";
import { Alert, ApplicableLabel, Button, Empty, Loading, PageTitle, Progress, Section } from "../components/ui";
import { TAX_LABEL, formatDate, formatDateTime, formatRupiah } from "../utils/format";

function RecommendationItem({ item, onToggle, busyId }) {
  const done = item.actions.filter((a) => a.done).length;
  return (
    <article className="rounded-md bg-white p-6 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink-soft">{item.code}</p>
          <h3 className="text-lg font-extrabold">{TAX_LABEL[item.taxType] || item.taxType}</h3>
          <p className="text-sm text-ink-soft">{item.name}</p>
        </div>
        <ApplicableLabel applicable={item.applicable} />
      </div>

      <p className="mt-4 max-w-prose leading-relaxed">{item.reason}</p>

      {(item.estimatedAmount !== null || item.nextDueDate) && (
        <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-sm">
          {item.estimatedAmount !== null && (
            <div><dt className="text-ink-soft">Perkiraan nominal</dt><dd className="text-lg font-bold">{formatRupiah(item.estimatedAmount)}</dd></div>
          )}
          {item.nextDueDate && (
            <div><dt className="text-ink-soft">Jatuh tempo berikutnya</dt><dd className="text-lg font-bold">{formatDate(item.nextDueDate)}</dd></div>
          )}
        </dl>
      )}

      {item.actions.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold">Langkah yang disarankan ({done} dari {item.actions.length} selesai)</p>
          <ul className="space-y-2">
            {item.actions.map((action) => (
              <li key={action._id}>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-tosca" checked={action.done} disabled={busyId === action._id}
                    onChange={() => onToggle(action)} />
                  <span className={action.done ? "text-ink-soft line-through" : ""}>
                    {action.text}
                    {action.done && action.doneAt && <span className="ml-2 text-xs no-underline">(selesai {formatDate(action.doneAt)})</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.regulationIds?.length > 0 && (
        <p className="mt-5 text-sm text-ink-soft">
          Dasar aturan:{" "}
          {item.regulationIds.map((r, i) => (
            <span key={r._id}>
              {i > 0 && ", "}
              <Link to={`/pustaka/regulasi/${r._id}`} className="font-semibold text-tosca-dark underline-offset-4 hover:underline">{r.number}</Link>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

export default function RecommendationPage() {
  const { business, guard } = useCurrentBusiness();
  const toast = useToast();
  const { data: rec, loading, error, setData } = useApi(business ? `/businesses/${business._id}/recommendations/latest` : null);
  const [busyId, setBusyId] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  if (guard) return guard;
  if (loading && !rec) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!rec) return null;

  async function toggle(action) {
    setBusyId(action._id);
    try {
      const res = await api.patch(`/recommendations/${rec._id}/actions/${action._id}`, { done: !action.done });
      setData(res.data.data);
    } catch (err) {
      toast(getErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const res = await api.post(`/businesses/${business._id}/recommendations/generate`);
      setData(res.data.data);
      toast("Rekomendasi dihitung ulang dengan data dan aturan terbaru");
    } catch (err) {
      toast(getErrorMessage(err), "error");
    } finally {
      setRegenerating(false);
    }
  }

  const applicable = rec.items.filter((i) => i.applicable);
  const notApplicable = rec.items.filter((i) => !i.applicable);
  const actions = rec.items.flatMap((i) => i.actions);
  const doneCount = actions.filter((a) => a.done).length;

  return (
    <>
      <PageTitle
        note="Daftar pajak yang berlaku dan tidak berlaku untuk usaha Anda, beserta alasan dan langkahnya. Ini panduan edukatif, bukan nasihat pajak resmi."
        aside={<Button variant="quiet" onClick={regenerate} disabled={regenerating}>{regenerating ? "Menghitung…" : "Hitung ulang rekomendasi"}</Button>}
      >
        Rekomendasi pajak
      </PageTitle>

      <div className="mb-8 max-w-md">
        <p className="mb-2 text-sm">Checklist selesai: <strong>{doneCount} dari {actions.length}</strong></p>
        <Progress value={actions.length ? doneCount / actions.length : 0} label="Progres checklist saran" />
      </div>

      <Section title={`Berlaku untuk Anda (${applicable.length})`}>
        {applicable.length === 0 ? <Empty>Belum ada pajak yang berlaku. Tetap catat omzet setiap bulan.</Empty> : (
          <div className="space-y-4">{applicable.map((item) => <RecommendationItem key={item._id} item={item} onToggle={toggle} busyId={busyId} />)}</div>
        )}
      </Section>

      {notApplicable.length > 0 && (
        <Section title={`Tidak atau belum berlaku (${notApplicable.length})`} className="mt-10">
          <div className="space-y-4">{notApplicable.map((item) => <RecommendationItem key={item._id} item={item} onToggle={toggle} busyId={busyId} />)}</div>
        </Section>
      )}

      <p className="mt-10 text-xs text-ink-soft">
        Dibuat {formatDateTime(rec.generatedAt)} memakai aturan {rec.ruleVersion}. Omzet dasar: {formatRupiah(rec.profileSnapshot?.combinedRevenue)} (gabungan) untuk tahun {rec.profileSnapshot?.year}.
      </p>
    </>
  );
}
