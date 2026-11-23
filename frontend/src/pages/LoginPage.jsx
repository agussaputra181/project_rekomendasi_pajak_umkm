import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";
import AuthShell from "../components/AuthShell";
import { Alert, Button, Field, Input, PasswordInput } from "../components/ui";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault(); // cegah halaman reload
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err)); // termasuk 429 bila terlalu banyak percobaan
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Masuk">
      <Alert>{error}</Alert>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input id="email" type="email" name="email" autoComplete="username" value={form.email} onChange={handleChange} required />
        </Field>
        <Field label="Password">
          <PasswordInput id="current-password" name="password" autoComplete="current-password" value={form.password} onChange={handleChange} required />
        </Field>
        <Button className="w-full" disabled={loading}>{loading ? "Memproses…" : "Masuk"}</Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Belum punya akun? <Link to="/register" className="font-semibold text-tosca-dark underline-offset-4 hover:underline">Daftar sebagai pelaku UMKM</Link>
      </p>
    </AuthShell>
  );
}
