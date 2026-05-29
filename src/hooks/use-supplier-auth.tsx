import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  loginSupplier, registerSupplier, logoutSupplier, getSupplierSession,
} from "@/lib/supplier-auth.functions";

const STORAGE_KEY = "yan_supplier_token";

type Supplier = { supplier_id: string; nome_fantasia: string; cnpj?: string; email?: string };

type Ctx = {
  loading: boolean;
  supplier: Supplier | null;
  token: string | null;
  login: (cnpj: string, password: string) => Promise<void>;
  register: (input: {
    cnpj: string; nome_fantasia: string; razao_social: string;
    whatsapp: string; email: string; password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const SupplierAuthContext = createContext<Ctx | null>(null);

export function SupplierAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  const loginFn = useServerFn(loginSupplier);
  const registerFn = useServerFn(registerSupplier);
  const logoutFn = useServerFn(logoutSupplier);
  const sessionFn = useServerFn(getSupplierSession);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!t) { setLoading(false); return; }
    setToken(t);
    sessionFn({ data: { token: t } })
      .then((res) => setSupplier(res as Supplier))
      .catch(() => { localStorage.removeItem(STORAGE_KEY); setToken(null); })
      .finally(() => setLoading(false));
  }, [sessionFn]);

  const login = useCallback(async (cnpj: string, password: string) => {
    const res = await loginFn({ data: { cnpj, password } });
    localStorage.setItem(STORAGE_KEY, res.token);
    setToken(res.token);
    setSupplier({ supplier_id: res.supplier_id, nome_fantasia: res.nome_fantasia });
  }, [loginFn]);

  const register = useCallback(async (input: Parameters<Ctx["register"]>[0]) => {
    const res = await registerFn({ data: input });
    localStorage.setItem(STORAGE_KEY, res.token);
    setToken(res.token);
    setSupplier({ supplier_id: res.supplier_id, nome_fantasia: res.nome_fantasia });
  }, [registerFn]);

  const logout = useCallback(async () => {
    if (token) await logoutFn({ data: { token } }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    setToken(null); setSupplier(null);
  }, [token, logoutFn]);

  return (
    <SupplierAuthContext.Provider value={{ loading, supplier, token, login, register, logout }}>
      {children}
    </SupplierAuthContext.Provider>
  );
}

export function useSupplierAuth() {
  const ctx = useContext(SupplierAuthContext);
  if (!ctx) throw new Error("useSupplierAuth must be used within SupplierAuthProvider");
  return ctx;
}
