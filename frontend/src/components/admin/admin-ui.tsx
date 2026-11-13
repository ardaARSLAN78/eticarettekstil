"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

export function AdminSearch({
  onSearch,
  placeholder = "Ara…",
}: {
  onSearch: (value: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(value.trim());
  }
  return (
    <form className="admin-search" role="search" onSubmit={submit}>
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        maxLength={80}
        onChange={(event) => setValue(event.target.value)}
      />
      <button className="icon-button" aria-label="Ara">
        <Search size={17} />
      </button>
    </form>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="admin-pagination">
      <span>
        {total} kayıt · {page} / {pages}
      </span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Önceki
      </button>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Sonraki
      </button>
    </div>
  );
}

/** Excel formül enjeksiyonuna karşı kullanıcı verisi metin olarak dışa aktarılır. */
export function downloadCsv(name: string, rows: (string | number | boolean)[][]) {
  const content = rows
    .map((row) =>
      row
        .map((value) => {
          const raw = String(value);
          const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(";"),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
