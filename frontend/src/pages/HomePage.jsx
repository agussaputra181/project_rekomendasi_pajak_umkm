// Halaman awal berbeda per role: UMKM -> dashboard usaha, pendamping/admin -> dashboard monitoring.
import { useAuth } from "../context/AuthContext";
import DashboardPage from "./DashboardPage";
import MonitoringPage from "./pendamping/MonitoringPage";

export default function HomePage() {
  const { user } = useAuth();
  return user.role === "umkm" ? <DashboardPage /> : <MonitoringPage />;
}
