"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";

export function useAdminQuery<T>(query: string, variables?: Record<string, unknown>) {
  const serialized = JSON.stringify(variables ?? {});
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      setData(await api<T>(query, JSON.parse(serialized)));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [query, serialized]);

  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}
