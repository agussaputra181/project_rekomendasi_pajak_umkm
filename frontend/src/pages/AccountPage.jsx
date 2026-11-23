// Ganti password (PUT /auth/password)
import { useState } from "react";
import api, { getErrorMessage, getFieldErrors } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Alert, Button, Field, PageTitle, Panel, PasswordInput } from "../components/ui";
import { ROLE_LABEL } from "../utils/format";

export default function AccountPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSaving(true);
    try {
      await api.put("/auth/password", form);
      setForm({ currentPassword: "", newPassword: "" });
      toast("Password berhasil diganti");
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle note={`${user.email}, ${ROLE_LABEL[user.role]}`}>Akun {user.name}</PageTitle>
      <Panel className="max-w-md">
        <h2 className="mb-4 font-bold">Ganti password</h2>
        <Alert>{error}</Alert>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Password lama">
            <PasswordInput autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          </Field>
          <Field label="Password baru" hint="Minimal 8 karakter" error={fieldErrors.newPassword}>
            <PasswordInput autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={8} />
          </Field>
          <Button disabled={saving}>{saving ? "Menyimpan…" : "Simpan password baru"}</Button>
        </form>
      </Panel>
    </>
  );
}
