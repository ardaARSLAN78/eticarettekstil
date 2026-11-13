"use client";
import { createContext, useContext } from "react";

export const AdminContext = createContext<(message: string) => void>(() => {});
export const useAdminNotice = () => useContext(AdminContext);
