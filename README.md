# Sistem Informasi Rekomendasi dan Edukasi Kewajiban Pajak UMKM

Aplikasi web (React + Express + MongoDB + JWT) untuk menentukan pajak yang berlaku bagi UMKM,
menghitung estimasinya, mengingatkan jatuh tempo, dan mengedukasi pelaku usaha.

## Menjalankan

1. Pastikan Node.js 24 LTS dan MongoDB Community Server sudah terpasang dan berjalan.
2. Backend:
   ```bash
   cd backend
   npm install
   copy .env.example .env      # Windows (Mac/Linux: cp .env.example .env), lalu isi JWT_SECRET
   npm run seed                # isi data awal (menghapus data lama)
   npm run dev                 # http://localhost:5000
   ```
3. Frontend (terminal kedua):
   ```bash
   cd frontend
   npm install
   copy .env.example .env
   npm run dev                 # http://localhost:5173
   ```

Akun contoh setelah seed: admin@pajakumkm.id / admin12345, pendamping@pajakumkm.id / pendamping123,
sari@contoh.id / umkm12345 (juga budi@, made@, rina@contoh.id).

## Pengujian

```bash
cd backend
npm run test:unit   # uji rumus & rule engine (tanpa database)
npm test            # semua uji termasuk API (mengunduh MongoDB sementara saat pertama kali)
```
