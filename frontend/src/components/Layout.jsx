// Kerangka halaman setelah login. Menu sidebar berbeda untuk setiap role.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home, ListChecks, CalendarDays, BookOpen, Users, Store, Calculator, History, FileDown,
  Library, KeyRound, Activity, Scale, Lightbulb, ScrollText, FileText, UserCog, Menu, X,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABEL } from "../utils/format";
import BusinessSwitcher from "./BusinessSwitcher";

// Menu per role. "group" dipakai sebagai pemisah kecil di sidebar.
const MENUS = {
  umkm: [
    { to: "/", label: "Ringkasan", icon: Home },
    { to: "/rekomendasi", label: "Rekomendasi & saran", icon: ListChecks },
    { to: "/jadwal", label: "Jadwal & notifikasi", icon: CalendarDays, badge: true },
    { group: "Catatan usaha" },
    { to: "/omzet", label: "Omzet bulanan", icon: BookOpen },
    { to: "/karyawan", label: "Karyawan", icon: Users },
    { to: "/profil", label: "Profil usaha", icon: Store },
    { group: "Hitung" },
    { to: "/hitung", label: "Kalkulator pajak", icon: Calculator },
    { to: "/riwayat", label: "Riwayat hitungan", icon: History },
    { to: "/ringkasan-tahunan", label: "Ringkasan tahunan (PDF)", icon: FileDown },
    { group: "Belajar" },
    { to: "/pustaka", label: "Pustaka pajak", icon: Library },
  ],
  pendamping: [
    { to: "/", label: "Pantauan UMKM binaan", icon: Activity },
    { to: "/jadwal", label: "Notifikasi", icon: CalendarDays, badge: true },
    { to: "/pustaka", label: "Pustaka pajak", icon: Library },
  ],
  admin: [
    { to: "/", label: "Pantauan semua UMKM", icon: Activity },
    { group: "Aturan" },
    { to: "/admin/aturan-tarif", label: "Aturan tarif", icon: Scale },
    { to: "/admin/aturan-saran", label: "Aturan saran", icon: Lightbulb },
    { group: "Konten" },
    { to: "/admin/regulasi", label: "Regulasi", icon: ScrollText },
    { to: "/admin/artikel", label: "Artikel edukasi", icon: FileText },
    { group: "Sistem" },
    { to: "/admin/pengguna", label: "Pengguna", icon: UserCog },
    { to: "/pustaka", label: "Pustaka (tampilan pengguna)", icon: Library },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const onSchedulePage = location.pathname === "/jadwal";

  // Jumlah notifikasi belum dibaca: saat halaman jadwal dibuka & setiap 2 menit
  useEffect(() => {
    if (user.role === "admin") return;
    const load = () => api.get("/notifications", { params: { unread: true, limit: 1 } }).then((res) => setUnread(res.data.data.unread)).catch(() => {});
    load();
    const timer = setInterval(load, 120000);
    return () => clearInterval(timer);
  }, [user.role, onSchedulePage]);

  // Di layar sempit menu tampil sebagai popover; tutup setelah memilih halaman
  function closeMenu() {
    const nav = document.getElementById("app-nav");
    if (nav?.matches(":popover-open")) nav.hidePopover();
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const linkClass = ({ isActive }) =>
    `mb-0.5 flex items-center gap-3 rounded-md border-l-4 px-3 py-2 text-sm ${
      isActive ? "border-tosca bg-white/10 font-bold text-white" : "border-transparent text-white/75 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <header className="app-topbar flex items-center justify-between bg-ink px-5 py-3 text-white md:hidden">
        <span className="font-extrabold">Pajak UMKM</span>
        {/* popoverTarget: browser yang membuka/menutup menu, tanpa state React */}
        <button type="button" popoverTarget="app-nav" aria-controls="app-nav" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold">
          <Menu size={20} aria-hidden="true" /> Menu
        </button>
      </header>

      <div className="md:bg-ink">
        <aside id="app-nav" popover="auto" className="flex-col text-white">
          <div className="flex items-start justify-between px-6 pb-5 pt-7">
            <div>
              <p className="text-lg font-extrabold">Pajak UMKM</p>
              <p className="mt-1 text-sm text-white/60">{ROLE_LABEL[user.role]}</p>
            </div>
            <button type="button" popoverTarget="app-nav" popoverTargetAction="hide" className="text-white/80 md:hidden">
              <X size={22} aria-hidden="true" /><span className="sr-only">Tutup menu</span>
            </button>
          </div>
          {user.role === "umkm" && <BusinessSwitcher />}
          <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-3">
            {MENUS[user.role].map((item) =>
              item.group ? (
                <p key={item.group} className="mb-1 mt-5 px-4 text-xs font-semibold text-white/45">{item.group}</p>
              ) : (
                <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={closeMenu} className={linkClass}>
                  <item.icon size={18} aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && unread > 0 && (
                    <span className="rounded-full bg-tosca px-2 text-xs font-bold text-white" aria-label={`${unread} belum dibaca`}>{unread}</span>
                  )}
                </NavLink>
              )
            )}
          </nav>
          <div className="mt-4 border-t border-white/15 px-6 py-5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <div className="mt-1 flex gap-4 text-sm">
              <NavLink to="/akun" onClick={closeMenu} className="flex items-center gap-1 text-white/70 hover:text-white">
                <KeyRound size={14} aria-hidden="true" /> Akun
              </NavLink>
              <button onClick={handleLogout} className="text-white/70 underline-offset-4 hover:text-white hover:underline">Keluar</button>
            </div>
          </div>
        </aside>
      </div>

      <main className="px-5 py-8 md:px-12 md:py-12">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
