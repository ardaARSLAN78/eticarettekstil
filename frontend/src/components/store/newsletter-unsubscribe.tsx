"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { Notice } from "../ui/notice";

export function NewsletterUnsubscribe({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function unsubscribe() {
    setBusy(true);
    setError("");
    try {
      await api("mutation($token:String!){unsubscribeNewsletter(token:$token)}", { token });
      setDone(true);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-container simple-page narrow-page">
      <span className="eyebrow">QUANTIA'DAN NOTLAR</span>
      <h1>{done ? "Tercihiniz kaydedildi." : "Bültenden ayrılma"}</h1>
      <p>
        {done
          ? "Bülten aboneliğiniz kapatıldı. Dilerseniz mağazadaki formdan tekrar katılabilirsiniz."
          : "Quantia bültenlerini almak istemiyorsanız aboneliğinizi buradan kapatabilirsiniz."}
      </p>
      {error && <Notice>{error}</Notice>}
      {!done && (
        <button className="button" disabled={busy || !token} onClick={() => void unsubscribe()}>
          {busy ? "Kaydediliyor…" : "Aboneliğimi kapat"}
        </button>
      )}
      {!token && <Notice>Geçerli bir abonelik bağlantısı gerekli.</Notice>}
      <p>
        <Link className="text-link" href="/">
          Mağazaya dön →
        </Link>
      </p>
    </div>
  );
}
