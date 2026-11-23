// Menyimpan data pengguna yang login (di memori) dan fungsi login/daftar/keluar.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { setToken, setUnauthorizedHandler } from "../api/client";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const saveSession = (data) => {
    setToken(data.token);
    setUser(data.user);
  };

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    saveSession(res.data.data);
    return res.data.data.user;
  }

  async function register(form) {
    const res = await api.post("/auth/register", form);
    saveSession(res.data.data);
    return res.data.data.user;
  }

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Token kedaluwarsa (1 jam): keluar dan kembali ke halaman login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast("Sesi berakhir. Silakan masuk lagi.", "info");
      navigate("/login");
    });
  }, [logout, navigate, toast]);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
