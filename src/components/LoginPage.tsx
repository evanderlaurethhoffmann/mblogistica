import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { toast } from "sonner";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  useEffect(() => {
    // Check if any profile exists; if not, show bootstrap form
    supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => {
      setNeedsBootstrap((count ?? 0) === 0);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (needsBootstrap) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name }, emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Administrador criado! Você já está logado.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Package className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl">Sistema de Romaneio</span>
        </div>
        {needsBootstrap && (
          <p className="text-sm text-center mb-4 p-3 bg-secondary rounded">
            Configuração inicial: crie o primeiro <b>administrador</b>.
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          {needsBootstrap && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : needsBootstrap ? "Criar administrador" : "Entrar"}
          </Button>
        </form>
        {!needsBootstrap && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            Apenas administradores podem cadastrar novos usuários.
          </p>
        )}
      </Card>
    </div>
  );
}

