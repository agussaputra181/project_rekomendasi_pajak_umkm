import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, getFieldErrors } from "../api/client";
import AuthShell from "../components/AuthShell";
import { Alert, Button, Field, Input, PasswordInput } from "../components/ui";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (form.password.length < 8) {
      setFieldErrors({ password: "Password minimal 8 karakter" });
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/usaha/baru"); // akun baru -> isi profil usaha dulu
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Daftar sebagai pelaku UMKM">
      <Alert>{error}</Alert>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nama lengkap" error={fieldErrors.name}>
          <Input name="name" autoComplete="name" value={form.name} onChange={handleChange} required minLength={3} />
        </Field>
        <Field label="Email" error={fieldErrors.email}>
          <Input type="email" name="email" autoComplete="email" value={form.email} onChange={handleChange} required />
        </Field>
        <Field label="Nomor HP (opsional)">
          <Input type="tel" name="phone" autoComplete="tel" value={form.phone} onChange={handleChange} />
        </Field>
        <Field label="Password" hint="Minimal 8 karakter" error={fieldErrors.password}>
          <PasswordInput name="password" autoComplete="new-password" value={form.password} onChange={handleChange} required />
        </Field>
        <Button className="w-full" disabled={loading}>{loading ? "Memproses…" : "Daftar"}</Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Sudah punya akun? <Link to="/login" className="font-semibold text-tosca-dark underline-offset-4 hover:underline">Masuk</Link>
      </p>
    </AuthShell>
  );
}
