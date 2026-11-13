export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { keepalive?: boolean },
): Promise<T> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "x-quantia-request": "1" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    keepalive: options?.keepalive,
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length)
    throw new ApiError(
      result.errors?.[0]?.message ?? "İşlem tamamlanamadı. Lütfen yeniden deneyin.",
      result.errors?.[0]?.extensions?.code,
    );
  return result.data as T;
}

export async function uploadMedia(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/media", {
    method: "POST",
    headers: { "x-quantia-request": "1" },
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.errors?.[0]?.message ?? "Görsel yüklenemedi.");
  return result as import("./types").MediaAsset;
}
