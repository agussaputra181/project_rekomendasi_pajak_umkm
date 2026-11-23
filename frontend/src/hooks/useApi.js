// Hook sederhana untuk mengambil data GET dengan tiga keadaan: memuat, error, data.
// Contoh: const { data, loading, error, reload } = useApi(`/businesses/${id}/revenues`, { year });
import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";

export default function useApi(url, params) {
  const [state, setState] = useState({ data: null, pagination: null, loading: true, error: "" });
  const key = JSON.stringify(params || {});

  const reload = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      setState({ data: res.data.data, pagination: res.data.pagination || null, loading: false, error: "" });
    } catch (err) {
      setState({ data: null, pagination: null, loading: false, error: getErrorMessage(err) });
    }
  }, [url, key]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}
