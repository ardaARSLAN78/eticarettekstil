"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";

export function Newsletter({ title }: { title: string }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setStatus("");
    try {
      await api(
        "mutation($email:String!,$consent:Boolean!){subscribeNewsletter(email:$email,consent:$consent)}",
        { email: fields.get("email"), consent: fields.get("consent") === "on" },
      );
      setStatus("Seçkimize hoş geldiniz. Kaydınız alındı.");
      form.reset();
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="newsletter">
      <div>
        <span className="eyebrow">QUANTIA'DAN NOTLAR</span>
        <h2>{title}</h2>
        <p>Yeni seçkiler, ilham veren hikâyeler ve size özel haberler.</p>
      </div>
      <form onSubmit={submit}>
        <div className="newsletter-input">
          <input
            name="email"
            type="email"
            placeholder="E-posta adresiniz"
            aria-label="Bülten e-posta adresi"
            required
            maxLength={100}
          />
          <button type="submit" disabled={busy} aria-label="Bültene katıl">
            {busy ? "…" : <ArrowRight size={22} />}
          </button>
        </div>
        <label className="check-label newsletter-consent">
          <input type="checkbox" name="consent" required />
          <span>
            <Link href="/bilgilendirme/gizlilik">Gizlilik metnini</Link> okudum, bülten almak
            istiyorum.
          </span>
        </label>
        {status && (
          <p className="newsletter-status" role="status">
            {status}
          </p>
        )}
      </form>
    </section>
  );
}
