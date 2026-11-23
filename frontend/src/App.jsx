// Daftar halaman (sesuai sitemap SRS 3.7).
// <ProtectedRoute> = wajib login (dan memasang Layout). <RoleRoute roles={[...]}> = hanya role tertentu.
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import AccountPage from "./pages/AccountPage";
// UMKM
import WizardPage from "./pages/WizardPage";
import RecommendationPage from "./pages/RecommendationPage";
import RevenuePage from "./pages/RevenuePage";
import EmployeesPage from "./pages/EmployeesPage";
import CalculatorPage from "./pages/CalculatorPage";
import HistoryPage from "./pages/HistoryPage";
import AnnualSummaryPage from "./pages/AnnualSummaryPage";
// Bersama
import SchedulePage from "./pages/SchedulePage";
import LibraryPage from "./pages/LibraryPage";
import RegulationDetailPage from "./pages/RegulationDetailPage";
import ArticlePage from "./pages/ArticlePage";
// Pendamping & Admin
import MonitoringDetailPage from "./pages/pendamping/MonitoringDetailPage";
// Admin
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminRegulationsPage from "./pages/admin/AdminRegulationsPage";
import AdminTaxRulesPage from "./pages/admin/AdminTaxRulesPage";
import AdminAdviceRulesPage from "./pages/admin/AdminAdviceRulesPage";
import AdminArticlesPage from "./pages/admin/AdminArticlesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/akun" element={<AccountPage />} />
        <Route path="/jadwal" element={<SchedulePage />} />
        <Route path="/pustaka" element={<LibraryPage />} />
        <Route path="/pustaka/regulasi/:id" element={<RegulationDetailPage />} />
        <Route path="/pustaka/artikel/:slug" element={<ArticlePage />} />

        <Route element={<RoleRoute roles={["umkm"]} />}>
          <Route path="/usaha/baru" element={<WizardPage mode="create" />} />
          <Route path="/profil" element={<WizardPage mode="edit" />} />
          <Route path="/rekomendasi" element={<RecommendationPage />} />
          <Route path="/omzet" element={<RevenuePage />} />
          <Route path="/karyawan" element={<EmployeesPage />} />
          <Route path="/hitung" element={<CalculatorPage />} />
          <Route path="/riwayat" element={<HistoryPage />} />
          <Route path="/ringkasan-tahunan" element={<AnnualSummaryPage />} />
        </Route>

        <Route element={<RoleRoute roles={["pendamping", "admin"]} />}>
          <Route path="/pantauan/:id" element={<MonitoringDetailPage />} />
        </Route>

        <Route element={<RoleRoute roles={["admin"]} />}>
          <Route path="/admin/pengguna" element={<AdminUsersPage />} />
          <Route path="/admin/regulasi" element={<AdminRegulationsPage />} />
          <Route path="/admin/aturan-tarif" element={<AdminTaxRulesPage />} />
          <Route path="/admin/aturan-saran" element={<AdminAdviceRulesPage />} />
          <Route path="/admin/artikel" element={<AdminArticlesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
