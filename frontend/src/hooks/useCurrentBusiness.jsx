// Halaman UMKM butuh usaha yang dipilih. Jika belum ada usaha, tampilkan ajakan mengisi wizard.
import { Link } from "react-router-dom";
import { useBusiness } from "../context/BusinessContext";
import { Empty, Loading } from "../components/ui";

export default function useCurrentBusiness() {
  const { business, loading, businesses, reload } = useBusiness();
  let guard = null;
  if (loading && !business) guard = <Loading />;
  else if (!business) {
    guard = (
      <Empty>
        {businesses.length === 0 ? "Anda belum mengisi profil usaha. " : "Pilih usaha terlebih dahulu. "}
        <Link to="/usaha/baru" className="font-semibold text-tosca-dark underline underline-offset-4">Isi profil usaha</Link> agar sistem bisa menentukan pajak Anda.
      </Empty>
    );
  }
  return { business, guard, reloadBusinesses: reload };
}
