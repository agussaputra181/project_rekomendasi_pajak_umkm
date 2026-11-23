// Pesan singkat (toast) setelah aksi berhasil/gagal (NFR Usability: feedback status).
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const styles = { success: "border-ok", error: "border-due", info: "border-tosca" };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* aria-live: pembaca layar membacakan pesan baru */}
      <div aria-live="polite" role="status" className="no-print fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <p key={t.id} className={`rounded-md border-l-4 bg-white px-4 py-3 text-sm font-semibold shadow-lg ring-1 ring-line ${styles[t.type]}`}>
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
