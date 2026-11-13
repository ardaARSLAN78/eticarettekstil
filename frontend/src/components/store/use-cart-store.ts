"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cartFields } from "@/lib/queries";
import type { Cart, User } from "@/lib/types";

/** Sepetin kaynağı PostgreSQL'dir. Tarayıcı yalnızca sunucunun onayladığı sonucu gösterir. */
export function useCartStore(onError: (error: unknown) => void) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(0);
  const current = useRef<Cart | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const channel = useRef<BroadcastChannel | null>(null);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;

  const accept = useCallback((next: Cart) => {
    // Geç yanıtlanan eski istek, yeni sepeti ekranda geri alamaz.
    if (current.current?.id === next.id && current.current.version > next.version) return;
    current.current = next;
    setCart(next);
  }, []);

  const enqueue = useCallback(<T>(work: () => Promise<T>): Promise<T> => {
    setPending((count) => count + 1);
    const run = async (): Promise<T> =>
      typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request("quantia-cart", work)
        : await work();
    const next = queue.current.catch(() => undefined).then(run);
    queue.current = next;
    return next.finally(() => setPending((count) => count - 1));
  }, []);

  const load = useCallback(async () => {
    const data = await api<{ cart: Cart; me: User | null }>(
      `{cart{${cartFields}} me{id name email role}}`,
    );
    accept(data.cart);
    setUser(data.me);
  }, [accept]);

  const refresh = useCallback(async () => {
    await enqueue(load);
    channel.current?.postMessage("refresh");
  }, [enqueue, load]);

  useEffect(() => {
    const sync = () => void enqueue(load).catch((error) => errorHandler.current(error));
    sync();
    const bus =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("quantia-cart-state") : null;
    channel.current = bus;
    if (bus) bus.onmessage = sync;
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      bus?.close();
      channel.current = null;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enqueue, load]);

  const mutate = useCallback(
    async (variantId: string, value: number, relative: boolean) => {
      await enqueue(async () => {
        if (!current.current) await load();
        const operation = relative ? "adjustCartItem" : "setCartItem";
        const argument = relative ? "delta" : "quantity";
        try {
          const result = await api<Record<string, Cart>>(
            `mutation($id:ID!,$value:Int!${relative ? "" : ",$version:Int!"}){
            ${operation}(variantId:$id,${argument}:$value${relative ? "" : ",expectedVersion:$version"}){${cartFields}}
          }`,
            { id: variantId, value, ...(!relative ? { version: current.current!.version } : {}) },
            { keepalive: true },
          );
          accept(result[operation]);
          channel.current?.postMessage("refresh");
        } catch (error) {
          // Yanıt kesilse bile gerçek sonuç tekrar sorgulanır; eski kayıt geri yazılmaz.
          await load().catch(() => undefined);
          throw error;
        }
      });
    },
    [accept, enqueue, load],
  );

  return {
    cart,
    user,
    busy: pending > 0,
    refresh,
    setItem: (id: string, quantity: number) => mutate(id, quantity, false),
    adjustItem: (id: string, delta: number) => mutate(id, delta, true),
  };
}
