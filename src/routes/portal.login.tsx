import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SupplierAuthProvider, useSupplierAuth } from "@/hooks/use-supplier-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  tab: z.enum(["login", "register"]).optional(),
});

export const Route = createFileRoute("/portal/login")({
  head: () => ({ meta: [{ title: "Acesso do Fornecedor — YAN" }] }),
  validateSearch: searchSchema,
  component: () => (
    <SupplierAuthProvider>
      <LoginPage />
    </SupplierAuthProvider>
  ),
});

function LoginPage() {
  const { supplier, loading, login, register } = useSupplierAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"login" | "register">(search.tab ?? "login");

  useEffect(() => {
    if (!loading && supplier) navigate({ to: "/portal/painel", replace: true });
  }, [loading, supplier, navigate]);

  const [loginForm, setLoginForm] = useState({ cnpj: "", password: "" });
  const [regForm, setRegForm] = useState({
    cnpj: "", nome_fantasia: "", razao_social: "", whatsapp: "", email: "", password: "", confirm: "",
  });
  const [busy, setBusy] = useState(false);

  const doLogin = async () => {
    if (!loginForm.cnpj || !loginForm.password) { toast.error("Informe CNPJ e senha."); return; }
    setBusy(true);
    try {
      await login(loginForm.cnpj, loginForm.password);
      toast.success("Bem-vindo!");
      navigate({ to: "/portal/painel", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no login.");
    } finally { setBusy(false); }
  };

  const doRegister = async () => {
    if (regForm.password !== regForm.confirm) { toast.error("As senhas não conferem."); return; }
    if (regForm.password.length < 6) { toast.error("Senha deve ter no mínimo 6 caracteres."); return; }
    setBusy(true);
    try {
      await register({
        cnpj: regForm.cnpj, nome_fantasia: regForm.nome_fantasia, razao_social: regForm.razao_social,
        whatsapp: regForm.whatsapp, email: regForm.email, password: regForm.password,
      });
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/portal/painel", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no cadastro.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="YAN" style={{ maxWidth: 200 }} className="h-auto" />
        </div>
        <Card className="p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input value={loginForm.cnpj} onChange={(e) => setLoginForm({ ...loginForm, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <Label>Senha</Label>
                <Input type="password" value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }} />
              </div>
              <Button className="w-full" onClick={doLogin} disabled={busy}>Entrar</Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-3 pt-4">
              <div className="space-y-1">
                <Label>CNPJ *</Label>
                <Input value={regForm.cnpj} onChange={(e) => setRegForm({ ...regForm, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <Label>Nome Fantasia *</Label>
                <Input value={regForm.nome_fantasia} onChange={(e) => setRegForm({ ...regForm, nome_fantasia: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Razão Social *</Label>
                <Input value={regForm.razao_social} onChange={(e) => setRegForm({ ...regForm, razao_social: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>WhatsApp *</Label>
                  <Input value={regForm.whatsapp} onChange={(e) => setRegForm({ ...regForm, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1">
                  <Label>E-mail *</Label>
                  <Input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Senha *</Label>
                  <Input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Confirmar Senha *</Label>
                  <Input type="password" value={regForm.confirm} onChange={(e) => setRegForm({ ...regForm, confirm: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" onClick={doRegister} disabled={busy}>Criar conta</Button>
            </TabsContent>
          </Tabs>
        </Card>
        <div className="text-center mt-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/portal" className="gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
