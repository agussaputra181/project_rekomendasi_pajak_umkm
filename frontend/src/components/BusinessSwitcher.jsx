// Pilihan usaha bila satu pengguna punya lebih dari satu usaha.
import { Link } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { ENTITY_LABEL } from "../utils/format";

export default function BusinessSwitcher() {
  const { businesses, business, selectBusiness } = useBusiness();
  if (!business) return null;
  return (
    <div className="px-6 pb-4">
      <label className="block text-xs font-semibold text-white/50" htmlFor="business-switch">Usaha aktif</label>
      {businesses.length > 1 ? (
        <select id="business-switch" value={business._id} onChange={(e) => selectBusiness(e.target.value)}
          className="mt-1 w-full rounded-md bg-white/10 px-2 py-2 text-sm font-semibold text-white">
          {businesses.map((b) => <option key={b._id} value={b._id} className="text-ink">{b.businessName}</option>)}
        </select>
      ) : (
        <p className="mt-1 truncate text-sm font-semibold">{business.businessName}</p>
      )}
      <p className="mt-1 text-xs text-white/50">{ENTITY_LABEL[business.entityType]}</p>
      <Link to="/usaha/baru" className="mt-1 inline-block text-xs text-white/70 underline underline-offset-2 hover:text-white">Tambah usaha lain</Link>
    </div>
  );
}
