"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { date, errorMessage } from "@/lib/format";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";
import { useAdminNotice } from "./admin-context";
import type { Paged } from "./admin-types";
import { AdminSearch, Pagination } from "./admin-ui";
import { useAdminQuery } from "./use-admin-query";

interface AccessUser {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  createdAt: string;
}

function UserAccessForm({
  user,
  onDone,
  onCancel,
}: {
  user: AccessUser | null;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const notice = useAdminNotice();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    const input = user
      ? {
          id: user.id,
          role: fields.get("role"),
          disabled: fields.get("disabled") === "on",
          currentPassword: fields.get("currentPassword"),
        }
      : {
          name: fields.get("name"),
          email: fields.get("email"),
          password: fields.get("password"),
          currentPassword: fields.get("currentPassword"),
        };
    try {
      await api(
        user
          ? "mutation($input:JSON!){updateUserAccess(input:$input)}"
          : "mutation($input:JSON!){createStaff(input:$input)}",
        { input },
      );
      notice(
        user
          ? "Hesap erişimi güncellendi. İlgili hesabın oturumları kapatıldı."
          : "Yeni yönetici oluşturuldu.",
      );
      await onDone();
      onCancel();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>{user ? `${user.name} · Erişim` : "Yeni yönetici"}</h2>
        <button className="text-link" onClick={onCancel}>
          Kapat
        </button>
      </div>
      <form onSubmit={submit}>
        <div className="form-grid">
          {user ? (
            <>
              <label className="field">
                <span>Yetki</span>
                <select name="role" defaultValue={user.role}>
                  <option value="CUSTOMER">Müşteri</option>
                  <option value="ADMIN">Yönetici · tüm mağaza erişimi</option>
                </select>
              </label>
              <label className="check-label">
                <input type="checkbox" name="disabled" defaultChecked={user.disabled} />
                Hesabı kapat / girişe izin verme
              </label>
            </>
          ) : (
            <>
              <Field label="Ad soyad" name="name" required maxLength={100} />
              <Field label="E-posta" name="email" type="email" required autoComplete="off" />
              <Field
                label="Yeni yöneticinin şifresi"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </>
          )}
          <Field
            label="İşlemi doğrulamak için kendi yönetici şifreniz"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <p className="admin-footnote">
          Yönetici tüm mağaza kayıtlarına erişebilir. Son etkin yöneticinin erişimi kapatılamaz.
          Erişim değişikliği kayıt altına alınır.
        </p>
        {error && <Notice>{error}</Notice>}
        <div className="admin-form-actions">
          <button className="button" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Erişimi kaydet"}
          </button>
          <button type="button" className="button button-outline" onClick={onCancel}>
            Vazgeç
          </button>
        </div>
      </form>
    </section>
  );
}

export function UsersAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [editing, setEditing] = useState<AccessUser | null | undefined>(undefined);
  const { data, error, reload } = useAdminQuery<{ adminUsers: Paged<AccessUser> }>(
    "query($filter:JSON){adminUsers(filter:$filter)}",
    { filter: { page, search, ...(role ? { role } : {}) } },
  );
  const result = data?.adminUsers;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">ERİŞİM YÖNETİMİ</span>
          <h1>Kullanıcılar & yetkiler</h1>
          <p>Yönetici hesapları ve müşteri giriş izinleri.</p>
        </div>
        <button className="button" onClick={() => setEditing(null)}>
          Yönetici ekle
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
      {editing !== undefined && (
        <UserAccessForm
          key={editing?.id ?? "new"}
          user={editing}
          onDone={reload}
          onCancel={() => setEditing(undefined)}
        />
      )}
      <section className="admin-panel">
        <div className="admin-filter-bar">
          <AdminSearch
            placeholder="Kullanıcı adı veya e-posta"
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <select
            aria-label="Yetkiye göre filtrele"
            className="admin-filter"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tüm yetkiler</option>
            <option value="ADMIN">Yöneticiler</option>
            <option value="CUSTOMER">Müşteriler</option>
          </select>
        </div>
        <div className="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Yetki</th>
                <th>Hesap</th>
                <th>Kayıt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result?.items.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.name}
                    <small>{user.email}</small>
                  </td>
                  <td>{user.role === "ADMIN" ? "Yönetici" : "Müşteri"}</td>
                  <td>
                    <span className={`status-pill ${user.disabled ? "danger" : ""}`}>
                      {user.disabled ? "Kapalı" : "Etkin"}
                    </span>
                  </td>
                  <td>{date(user.createdAt)}</td>
                  <td>
                    <button className="text-link" onClick={() => setEditing(user)}>
                      Erişimi düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result && (
          <Pagination page={page} total={result.total} pages={result.pages} onPage={setPage} />
        )}
      </section>
    </>
  );
}
