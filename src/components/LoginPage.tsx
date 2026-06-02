import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { resolveInternalLogin } from "@/lib/users.functions";

export function LoginPage() {
  const resolveLogin = useServerFn(resolveInternalLogin);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { email } = await resolveLogin({ data: { identifier } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar no portal interno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src="/logo.png" alt="MB Logística by YAN" style={{ maxWidth: 180 }} className="w-full h-auto" />
          <span className="font-bold text-lg text-center">Acesso Interno · Sistema de Romaneio</span>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Nome de Usuário</Label>
            <Input id="identifier" type="text" autoCapitalize="none" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="evander.hoffmann" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : "Entrar no Portal"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Apenas administradores podem cadastrar novos usuários.
        </p>
      </Card>
    </div>
  );
}
