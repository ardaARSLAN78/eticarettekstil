"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useCartStore } from "./use-cart-store";
import type { Cart, StoreSettings, User } from "@/lib/types";
import { errorMessage } from "@/lib/format";
import { CartDrawer } from "./cart-drawer";

interface ShopContextValue {
  cart: Cart | null;
  user: User | null;
  busy: boolean;
  settings: StoreSettings;
  openCart: () => void;
  refresh: () => Promise<void>;
  setItem: (variantId: string, quantity: number) => Promise<void>;
  adjustItem: (variantId: string, delta: number) => Promise<void>;
  notify: (message: string) => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({
  settings,
  children,
}: {
  settings: StoreSettings;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { cart, user, busy, refresh, setItem, adjustItem } = useCartStore((error) =>
    setMessage(errorMessage(error)),
  );
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <ShopContext.Provider
      value={{
        cart,
        user,
        busy,
        settings,
        openCart: () => setOpen(true),
        refresh,
        setItem,
        adjustItem,
        notify: setMessage,
      }}
    >
      {children}
      <CartDrawer open={open} onClose={() => setOpen(false)} />
      {message && (
        <div className="toast" role="status">
          {message}
          <button type="button" aria-label="Bildirimi kapat" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("ShopProvider gerekli.");
  return context;
}
