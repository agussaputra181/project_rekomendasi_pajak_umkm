// Kalender jatuh tempo (UMKM) dan notifikasi (semua role) - SRS FR-014.
import { useState } from "react";
import api, { getErrorMessage } from "../api/client";
import useApi from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { useToast } from "../context/ToastContext";
import { Alert, Button, Checkbox, Empty, Loading, PageTitle, Pagination, Section, Select } from "../components/ui";
import { MONTHS, TAX_LABEL, formatDate, formatDateTime } from "../utils/format";

const thisYear = new Date().getFullYear();
const NOTIF_LABEL = { DEADLINE: "Jatuh tempo", THRESHOLD: "Batas omzet", RULE_UPDATE: "Aturan baru", INFO: "Info" };
const NOTIF_COLOR = { DEADLINE: "border-warn", THRESHOLD: "border-due", RULE_UPDATE: "border-tosca", INFO: "border-line" };

function Deadlines({ business }) {
  const [year, setYear] = useState(thisYear);
  const [showPast, setShowPast] = useState(false);
  const { data, loading, error } = useApi(`/businesses/${business._id}/deadlines`, { year });
  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;

  const today = new Date(new Date().toISOString().slice(0, 10));
  const events = data.events.filter((e) => showPast || new Date(e.dueDate) >= today);
  // Kelompokkan per bulan jatuh tempo
  const groups = {};
  for (const e of events) {
    const d = new Date(e.dueDate);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    (groups[key] ||= { label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, items: [] }).items.push(e);
  }

  return (
    <Section
      title={`Kalender jatuh tempo ${business.businessName}`}
      aside={
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox label="Tampilkan yang sudah lewat" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
          <span className="w-28"><Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Tahun pajak">{[thisYear - 1, thisYear].map((y) => <option key={y}>{y}</option>)}</Select></span>
        </div>
      }
    >
      <p className="mb-4 text-sm text-ink-soft">Jika batas jatuh pada Sabtu, Minggu, libur nasional, atau cuti bersama, sistem menggesernya ke hari kerja berikutnya.</p>
      {Object.keys(groups).length === 0 ? <Empty>Tidak ada jatuh tempo yang perlu ditampilkan.</Empty> : (
        <div className="space-y-6">
          {Object.values(groups).map((g) => (
            <div key={g.label}>
              <h3 className="mb-2 text-sm font-bold text-ink-soft">{g.label}</h3>
              <ul className="divide-y divide-line rounded-md bg-white ring-1 ring-line">
                {g.items.map((e) => (
                  <li key={e.key} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                    <span className="font-bold">{formatDate(e.dueDate)}</span>
                    <span>{e.title}{e.shifted && <span className="block text-xs text-ink-soft">Digeser dari {formatDate(e.originalDate)}</span>}</span>
                    <span className="text-ink-soft">{TAX_LABEL[e.taxType] || e.taxType}, {e.kind}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Notifications() {
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, pagination, loading, error, reload } = useApi("/notifications", { unread: unreadOnly || undefined, page, limit: 10 });

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }
  async function markAll() {
    await api.patch("/notifications/read-all");
    toast("Semua notifikasi ditandai dibaca");
    reload();
  }

  return (
    <Section
      title={`Notifikasi${data ? ` (${data.unread} belum dibaca)` : ""}`}
      className="mt-10"
      aside={
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox label="Hanya yang belum dibaca" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
          {data?.unread > 0 && <Button variant="quiet" onClick={markAll}>Tandai semua dibaca</Button>}
        </div>
      }
    >
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : data.items.length === 0 ? <Empty>Belum ada notifikasi.</Empty> : (
        <>
          <ul className="space-y-2">
            {data.items.map((n) => (
              <li key={n._id} className={`rounded-md border-l-4 bg-white px-5 py-4 ring-1 ring-line ${NOTIF_COLOR[n.type]} ${n.isRead ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">{NOTIF_LABEL[n.type]}, {formatDateTime(n.createdAt)}</p>
                    <p className={n.isRead ? "" : "font-bold"}>{n.title}</p>
                    {n.message && <p className="mt-1 text-sm text-ink-soft">{n.message}</p>}
                  </div>
                  {!n.isRead && <button type="button" onClick={() => markRead(n._id)} className="text-sm font-semibold text-tosca-dark underline-offset-4 hover:underline">Tandai dibaca</button>}
                </div>
              </li>
            ))}
          </ul>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}
    </Section>
  );
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  return (
    <>
      <PageTitle note="Pengingat dibuat 3 hari sebelum jatuh tempo, pada hari jatuh tempo, dan saat terlewat.">
        {user.role === "umkm" ? "Jadwal & notifikasi" : "Notifikasi"}
      </PageTitle>
      {user.role === "umkm" && business && <Deadlines key={business._id} business={business} />}
      <Notifications />
    </>
  );
}
