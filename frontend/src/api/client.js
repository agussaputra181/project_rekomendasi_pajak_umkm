// src/api/client.js
// Satu instance axios untuk semua panggilan ke backend.
// Token JWT disimpan di MEMORI (variabel), bukan localStorage, sesuai SRS 3.6:
// lebih aman dari pencurian lewat XSS. Konsekuensinya: setelah halaman di-refresh, pengguna login lagi.
import axios from "axios";

let token = null; // token aktif (hanya di memori)
let onUnauthorized = null; // fungsi yang dipanggil saat token kedaluwarsa

export function setToken(value) {
  token = value;
}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
});

// Tempelkan token ke setiap request
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token kedaluwarsa / tidak valid -> keluar otomatis (kecuali saat sedang login atau ganti password)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && token && !url.includes("/auth/login") && !url.includes("/auth/password")) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// Pesan error dari backend: { status: "error", message, errors: [{ field, message }] }
export function getErrorMessage(error) {
  return error.response?.data?.message || "Tidak dapat terhubung ke server. Pastikan backend berjalan.";
}

// Ubah daftar error field menjadi objek { email: "Format email tidak valid", ... }
export function getFieldErrors(error) {
  const list = error.response?.data?.errors || [];
  return Object.fromEntries(list.map((e) => [e.field, e.message]));
}

export default api;
