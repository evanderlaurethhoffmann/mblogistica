import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type Role = "admin" | "operator";
export type ModuleKey = "yms" | "wms" | "tms" | "analytics";

export interface ModulePermissions {
  yms: boolean;
  wms: boolean;
  tms: boolean;
  analytics: boolean;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role | null;
  category: string | null;
  permissions: ModulePermissions;
  loading: boolean;
  isAdmin: boolean;
  canAccess: (m: ModuleKey) => boolean;
  signOut: () => Promise<void>;
}

const defaultPerms: ModulePermissions = { yms: false, wms: false, tms: false, analytics: false };

const Ctx = createContext<AuthCtx>({
  user: null, session: null, role: null, category: null,
  permissions: defaultPerms, loading: true, isAdmin: false,
  canAccess: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<ModulePermissions>(defaultPerms);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setRole(null);
        setCategory(null);
        setPermissions(defaultPerms);
      }
      qc.invalidateQueries();
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (uid: string) => {
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).order("role").limit(1).maybeSingle(),
      supabase.from("profiles").select("category, acesso_yms, acesso_wms, acesso_tms, acesso_analytics").eq("id", uid).maybeSingle(),
    ]);
    const r = (roleRow?.role as Role) ?? "operator";
    setRole(r);
    setCategory((profile as any)?.category ?? null);
    if (r === "admin") {
      setPermissions({ yms: true, wms: true, tms: true, analytics: true });
    } else {
      setPermissions({
        yms: !!(profile as any)?.acesso_yms,
        wms: !!(profile as any)?.acesso_wms,
        tms: !!(profile as any)?.acesso_tms,
        analytics: !!(profile as any)?.acesso_analytics,
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setSession(null);
    setPermissions(defaultPerms);
  };

  const isAdmin = role === "admin";
  const canAccess = (m: ModuleKey) => isAdmin || permissions[m];

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session,
      role,
      category,
      permissions,
      loading,
      isAdmin,
      canAccess,
      signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
