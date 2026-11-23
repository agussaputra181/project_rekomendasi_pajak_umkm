// Manajemen pengguna (SRS FR-002): cari, filter role, ubah role/status, tetapkan pendamping, nonaktifkan.
import { useState } from "react";
import api, { getErrorMessage } from "../../api/client";
import useApi from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Alert, Button, ConfirmButton, Input, Loading, PageTitle, Pagination, Select, td, th } from "../../components/ui";
import { ROLE_LABEL, formatDate } from "../../utils/format";

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useState({ q: "", role: "", isActive: "", page: 1 });
  const [search, setSearch] = useState("");
  const params = Object.fromEntries(Object.entries({ ...filters, limit: 10 }).filter(([, v]) => v !== ""));
  const { data: users, pagination, loading, error, reload } = useApi("/users", params);
  const pendampingList = useApi("/users", { role: "pendamping", isActive: true, limit: 100 });

  async function run(promise, message) {
    try {
      await promise;
      toast(message);
      reload();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  return (
    <>
      <PageTitle note="Akun pendamping dibuat dengan mendaftar biasa, lalu ubah perannya menjadi Pendamping Pajak di sini.">Pengguna</PageTitle>
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
        <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setFilters({ ...filters, q: search.trim(), page: 1 }); }}>
          <Input type="search" placeholder="Cari nama atau email" aria-label="Cari nama atau email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button>Cari</Button>
        </form>
        <Select aria-label="Peran" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}>
          <option value="">Semua peran</option>{Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select aria-label="Status" value={filters.isActive} onChange={(e) => setFilters({ ...filters, isActive: e.target.value, page: 1 })}>
          <option value="">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option>
        </Select>
      </div>

      {loading && !users ? <Loading /> : error ? <Alert>{error}</Alert> : (
        <div className="overflow-x-auto rounded-md bg-white p-5 ring-1 ring-line">
          <table className="w-full min-w-[52rem] text-sm">
            <thead><tr><th className={th}>Nama</th><th className={th}>Peran</th><th className={th}>Pendamping</th><th className={th}>Terdaftar</th><th className={th}>Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id} className={u.isActive ? "" : "text-ink-soft"}>
                    <td className={td}><span className="font-semibold">{u.name}</span><span className="block text-xs text-ink-soft">{u.email}</span></td>
                    <td className={td}>
                      <Select aria-label={`Peran ${u.name}`} value={u.role} disabled={self}
                        onChange={(e) => run(api.put(`/users/${u._id}`, { role: e.target.value }), `Peran ${u.name} diubah`)}>
                        {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    </td>
                    <td className={td}>
                      {u.role === "umkm" ? (
                        <Select aria-label={`Pendamping ${u.name}`} value={u.pendampingId?._id || ""}
                          onChange={(e) => run(api.patch(`/users/${u._id}/pendamping`, { pendampingId: e.target.value || null }), "Pendamping ditetapkan")}>
                          <option value="">Belum ada</option>
                          {(pendampingList.data || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </Select>
                      ) : <span className="text-ink-soft">-</span>}
                    </td>
                    <td className={td}>{formatDate(u.createdAt)}</td>
                    <td className={td}>
                      {self ? <span className="text-ink-soft">Akun Anda</span> : u.isActive ? (
                        <ConfirmButton title={`Nonaktifkan ${u.name}?`} message="Pengguna tidak bisa login, tetapi datanya tetap tersimpan." confirmLabel="Nonaktifkan"
                          onConfirm={() => run(api.delete(`/users/${u._id}`), `${u.name} dinonaktifkan`)} className="font-semibold text-due underline-offset-4 hover:underline">Nonaktifkan</ConfirmButton>
                      ) : (
                        <button type="button" onClick={() => run(api.put(`/users/${u._id}`, { isActive: true }), `${u.name} diaktifkan`)} className="font-semibold text-tosca-dark underline-offset-4 hover:underline">Aktifkan</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination pagination={pagination} onChange={(page) => setFilters({ ...filters, page })} />
        </div>
      )}
    </>
  );
}
