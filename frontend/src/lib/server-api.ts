import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { bootstrapQuery } from "./queries";
import type { Category, Collection, StoreSettings } from "./types";

export async function serverApi<T>(
  query: string,
  variables?: Record<string, unknown>,
  authenticated = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-quantia-request": "1",
    Origin: process.env.APP_ORIGIN ?? "http://localhost:3000",
  };
  if (authenticated) {
    const cookieStore = await cookies();
    headers.Cookie = ["quantia_session", "quantia_cart"]
      .flatMap((name) => {
        const value = cookieStore.get(name)?.value;
        return value ? [`${name}=${value}`] : [];
      })
      .join("; ");
  }
  const response = await fetch(
    `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4100"}/graphql`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = await response.json();
  if (!response.ok || result.errors?.length)
    throw new Error(result.errors?.[0]?.message ?? "Mağazaya şu anda ulaşılamıyor.");
  return result.data as T;
}

export const getBootstrap = cache(() =>
  serverApi<{ settings: StoreSettings; categories: Category[]; collections: Collection[] }>(
    bootstrapQuery,
  ),
);
