"use client";
import { useState } from "react";
import { Copy, Upload } from "lucide-react";
import type { MediaAsset } from "@/lib/types";
import { api, uploadMedia } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { useAdminQuery } from "./use-admin-query";
import { useAdminNotice } from "./admin-context";
import { Notice } from "../ui/notice";

export function MediaAdmin() {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useAdminQuery<{ adminMedia: MediaAsset[] }>(
    "query($page:Int){adminMedia(page:$page){id url alt bytes width height}}",
    { page },
  );
  const [operationError, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const notice = useAdminNotice();
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await uploadMedia(file);
      notice("Görsel yüklendi.");
      await reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function alt(id: string, value: string) {
    try {
      await api("mutation($id:ID!,$alt:String!){updateMediaAlt(id:$id,alt:$alt){id}}", {
        id,
        alt: value,
      });
      notice("Alternatif metin kaydedildi.");
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">MEDYA</span>
          <h1>Görsel kütüphanesi</h1>
          <p>Yüklenen görseller kalıcı depoda saklanır ve WebP olarak sunulur.</p>
        </div>
        <label className="button upload-button">
          <Upload size={16} />
          {busy ? "Yükleniyor…" : "Yeni görsel yükle"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
      </div>
      {(error || operationError) && <Notice>{error || operationError}</Notice>}
      <div className="admin-media-grid">
        {data?.adminMedia.map((asset) => (
          <article key={asset.id}>
            <div className="admin-media-photo">
              <img src={asset.url} alt={asset.alt} />
            </div>
            <div>
              <small>
                {asset.width} × {asset.height} · {Math.round(asset.bytes / 1024)} KB
              </small>
              <label className="field">
                <span>Alternatif metin</span>
                <input
                  defaultValue={asset.alt}
                  maxLength={200}
                  onBlur={(event) => {
                    if (event.target.value !== asset.alt) void alt(asset.id, event.target.value);
                  }}
                />
              </label>
              <button
                className="text-link"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(asset.url)
                    .then(() => notice("Görsel adresi kopyalandı."))
                    .catch(() => notice(asset.url));
                }}
              >
                <Copy size={13} /> Adresi kopyala
              </button>
            </div>
          </article>
        ))}
      </div>
      {data?.adminMedia.length === 0 && (
        <div className="admin-panel admin-empty">
          Henüz yüklenen bir görsel yok. İlk görselinizi ekleyin.
        </div>
      )}
      <div className="admin-pagination">
        <button className="text-link" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Önceki
        </button>
        <span>Sayfa {page}</span>
        <button
          className="text-link"
          disabled={(data?.adminMedia.length ?? 0) < 50}
          onClick={() => setPage(page + 1)}
        >
          Sonraki
        </button>
      </div>
    </>
  );
}
