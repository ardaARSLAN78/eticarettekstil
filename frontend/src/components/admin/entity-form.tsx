"use client";
import { useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { uploadMedia } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { Notice } from "../ui/notice";

function localDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export interface AdminField {
  key: string;
  label: string;
  kind?:
    | "text"
    | "textarea"
    | "number"
    | "money"
    | "percent"
    | "checkbox"
    | "select"
    | "date"
    | "image"
    | "multi";
  options?: { value: string; label: string }[];
  required?: boolean;
  nullable?: boolean;
  hint?: string;
  full?: boolean;
}

export function ImageField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const asset = await uploadMedia(file);
      onChange(asset.url);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-image-field">
      <label className="field">
        <span>{label}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/media/… veya https://…"
        />
      </label>
      <div className="image-upload-row">
        {value && <img src={value} alt={`${label} önizlemesi`} />}
        <label className="upload-button">
          <Upload size={15} />
          {busy ? "Yükleniyor…" : "Görsel yükle"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
        <small>JPEG, PNG, WebP · En fazla 8 MB</small>
      </div>
      {error && <Notice>{error}</Notice>}
    </div>
  );
}

export function EntityForm({
  fields,
  initial,
  onSave,
  onCancel,
  submitLabel = "Değişiklikleri kaydet",
  children,
}: {
  fields: AdminField[];
  initial: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  children?: React.ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(values);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={submit}>
      <div className="form-grid">
        {fields.map((field) => {
          const value = values[field.key];
          const kind = field.kind ?? "text";
          if (kind === "image")
            return (
              <div className="full-field" key={field.key}>
                <ImageField
                  label={field.label}
                  value={String(value ?? "")}
                  onChange={(url) => set(field.key, field.nullable && !url ? null : url)}
                />
              </div>
            );
          if (kind === "checkbox")
            return (
              <label className={`check-label ${field.full ? "full-field" : ""}`} key={field.key}>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => set(field.key, event.target.checked)}
                />
                <span>
                  {field.label}
                  {field.hint && <small>{field.hint}</small>}
                </span>
              </label>
            );
          if (kind === "multi")
            return (
              <fieldset className="admin-multiselect full-field" key={field.key}>
                <legend>{field.label}</legend>
                <div>
                  {field.options?.map((option) => (
                    <label className="check-label" key={option.value}>
                      <input
                        type="checkbox"
                        checked={Array.isArray(value) && value.includes(option.value)}
                        onChange={(event) =>
                          set(
                            field.key,
                            event.target.checked
                              ? [...(Array.isArray(value) ? value : []), option.value]
                              : (Array.isArray(value) ? value : []).filter(
                                  (id) => id !== option.value,
                                ),
                          )
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {field.hint && <small>{field.hint}</small>}
              </fieldset>
            );
          const display =
            kind === "money" || kind === "percent"
              ? value == null
                ? ""
                : String(Number(value) / 100)
              : kind === "date"
                ? localDateTime(value)
                : String(value ?? "");
          return (
            <label
              className={`field ${field.full || kind === "textarea" ? "full-field" : ""}`}
              key={field.key}
            >
              <span>{field.label}</span>
              {kind === "textarea" ? (
                <textarea
                  value={display}
                  rows={field.key.endsWith("Text") ? 7 : 3}
                  required={field.required !== false}
                  onChange={(event) =>
                    set(
                      field.key,
                      field.nullable && !event.target.value ? null : event.target.value,
                    )
                  }
                />
              ) : kind === "select" ? (
                <select
                  value={display}
                  required={field.required !== false}
                  onChange={(event) =>
                    set(
                      field.key,
                      field.nullable && !event.target.value ? null : event.target.value,
                    )
                  }
                >
                  {field.nullable && <option value="">Seçilmedi</option>}
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={display}
                  required={field.required !== false}
                  type={
                    kind === "date"
                      ? "datetime-local"
                      : ["money", "number", "percent"].includes(kind)
                        ? "number"
                        : "text"
                  }
                  min={["money", "number", "percent"].includes(kind) ? 0 : undefined}
                  step={kind === "money" || kind === "percent" ? ".01" : undefined}
                  onChange={(event) => {
                    const raw = event.target.value;
                    set(
                      field.key,
                      field.nullable && !raw
                        ? null
                        : kind === "date"
                          ? raw && !Number.isNaN(new Date(raw).getTime())
                            ? new Date(raw).toISOString()
                            : ""
                          : kind === "money" || kind === "percent"
                            ? Math.round(Number(raw) * 100)
                            : kind === "number"
                              ? Number(raw)
                              : raw,
                    );
                  }}
                />
              )}
              {field.hint && <small>{field.hint}</small>}
            </label>
          );
        })}
      </div>
      {error && <Notice>{error}</Notice>}
      {children}
      <div className="admin-form-actions">
        <button className="button" disabled={busy}>
          {busy ? "Kaydediliyor…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="button button-outline" onClick={onCancel}>
            Vazgeç
          </button>
        )}
      </div>
    </form>
  );
}

export const seoFields: AdminField[] = [
  {
    key: "seoTitle",
    label: "SEO başlığı",
    required: false,
    nullable: true,
    hint: "En fazla 70 karakter",
  },
  {
    key: "seoDescription",
    label: "SEO açıklaması",
    kind: "textarea",
    required: false,
    nullable: true,
    hint: "En fazla 180 karakter",
  },
  {
    key: "canonicalUrl",
    label: "Canonical adres",
    required: false,
    nullable: true,
    hint: "Gerekirse tam HTTPS adresi",
  },
  { key: "noIndex", label: "Arama motorlarında indekslenmesin", kind: "checkbox" },
];
