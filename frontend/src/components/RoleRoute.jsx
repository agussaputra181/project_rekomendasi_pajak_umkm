// Membatasi halaman untuk role tertentu, contoh: <RoleRoute roles={["admin"]} />
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
}
