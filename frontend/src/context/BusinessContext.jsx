// Daftar usaha milik UMKM yang login + usaha yang sedang dipilih.
// Satu pengguna boleh punya lebih dari satu usaha (SRS Tabel 25: businesses -> users N:1).
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user || user.role !== "umkm") return;
    setLoading(true);
    try {
      const res = await api.get("/businesses");
      const list = res.data.data;
      setBusinesses(list);
      setSelectedId((current) => (list.some((b) => b._id === current) ? current : list[0]?._id || null));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "umkm") reload();
    else {
      setBusinesses([]);
      setSelectedId(null);
    }
  }, [user, reload]);

  const business = businesses.find((b) => b._id === selectedId) || null;

  return (
    <BusinessContext.Provider value={{ businesses, business, selectBusiness: setSelectedId, reload, loading }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
