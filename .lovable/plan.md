
## Escopo

Reorganizar o Portal do Fornecedor para exigir login/cadastro próprio antes de agendar, criar painel exclusivo com histórico de solicitações, e padronizar a logo YAN nos cabeçalhos.

---

## 1. Banco de dados (migration)

Criar tabela `supplier_accounts` separada do `auth.users` do Supabase (fornecedores não são usuários internos):

```
supplier_accounts
  id uuid pk
  supplier_id uuid -> suppliers.id (1:1)
  cnpj text unique (digits only)
  password_hash text  -- bcrypt via pgcrypto
  created_at, updated_at
```

- Habilitar `pgcrypto` se necessário (`crypt`, `gen_salt`).
- RLS: bloquear acesso direto via anon (`USING (false)`). Toda autenticação será feita via **server functions** (`createServerFn`) que usam `supabaseAdmin` para validar `crypt(senha, password_hash) = password_hash`.
- Admin pode resetar senha via outra server function (já que ele está autenticado no Supabase Auth e tem role `admin`).

## 2. Server functions (`src/lib/supplier-auth.functions.ts`)

- `registerSupplier({ cnpj, nome_fantasia, razao_social, whatsapp, email, password })` — cria `suppliers` + `supplier_accounts` (com `crypt(password, gen_salt('bf'))`). Retorna `{ supplier_id, token }`.
- `loginSupplier({ cnpj, password })` — valida senha, retorna `{ supplier_id, nome_fantasia, token }`. Token = JWT simples assinado com `SUPABASE_SERVICE_ROLE_KEY` ou apenas um ID assinado (HMAC). Para simplicidade: gera token aleatório armazenado em `supplier_sessions` (id, supplier_id, token, expires_at).
- `getSupplierFromToken(token)` — helper interno.
- `getSupplierAppointments({ token })` — lista appointments do fornecedor logado (com `refusal_reason`).
- `createSupplierAppointment({ token, ...dadosCarga, scheduled_date, scheduled_time, estimated_minutes })` — cria o agendamento usando `supabaseAdmin`.
- `adminResetSupplierPassword({ supplier_id, newPassword })` — protegido por `requireSupabaseAuth` + checagem admin.

Tabela auxiliar:
```
supplier_sessions
  token text pk
  supplier_id uuid
  expires_at timestamptz
```

## 3. Frontend — fluxo de portal

Reorganizar rotas:
- `/portal` — landing/hub do fornecedor com botão "Solicitar Agendamento" → redireciona para `/portal/login`.
- `/portal/login` (nova) — tabs Login (CNPJ + Senha) e Cadastro (CNPJ, Nome Fantasia, Razão Social, WhatsApp, E-mail, Senha).
- `/portal/painel` (nova) — painel do fornecedor logado:
  - Botão destacado "Nova Solicitação de Agenda" → abre dialog/wizard com calendário (15 dias), horários, e dados da carga.
  - Tabela de histórico (Protocolo, Data/Hora, Volumes, Placa, Status como badge colorido). Ícone de info no status Recusado mostra `refusal_reason` em tooltip.
  - Botão sair.

Sessão do fornecedor: armazenar `supplier_token` em `localStorage` (chave `yan_supplier_token`). Hook `useSupplierAuth()` que valida ao montar.

O wizard de agendamento será reaproveitado da `portal.tsx` atual (steps 2 e 3 — Carga + Calendário) extraído para componente `SupplierAppointmentDialog`.

## 4. Logo nos cabeçalhos

Substituir títulos textuais "SISTEMA INTEGRADO DE LOGÍSTICA — CD" por `<img src="/logo.png" />` (max-width 200px, centralizado) em:
- `/portal` (landing externa)
- `/portal/login`
- `/portal/painel`

Layout interno (`Layout.tsx`) já mostra a logo na sidebar — manter.

## 5. Configurações internas

Em `/configuracoes`, adicionar aba "Senhas Fornecedores":
- Lista fornecedores cadastrados, botão "Resetar senha" abre dialog com nova senha → chama `adminResetSupplierPassword`.

---

## Detalhes técnicos

- **Hash de senha**: `crypt()` do pgcrypto (mais simples que bcrypt JS no Worker).
- **Tokens**: gerados via `crypto.randomUUID()` no server, persistidos em `supplier_sessions`, expiram em 30 dias.
- **Validação**: Zod em todas as server functions; CNPJ normalizado a 14 dígitos.
- **RLS** em `supplier_accounts` e `supplier_sessions`: `USING (false)` para anon/authenticated; acesso só via `supabaseAdmin` em server functions.
- **`appointments`**: continua igual; server function popula `supplier_id`.
- **Logo**: já existe `/public/logo.png`.

## Arquivos afetados

- Migration SQL (nova)
- `src/lib/supplier-auth.functions.ts` (novo)
- `src/hooks/use-supplier-auth.tsx` (novo)
- `src/components/SupplierAppointmentDialog.tsx` (novo, extraído de portal.tsx)
- `src/routes/portal.tsx` (refatorado — agora apenas landing/hub)
- `src/routes/portal.login.tsx` (novo)
- `src/routes/portal.painel.tsx` (novo)
- `src/routes/configuracoes.tsx` (nova aba)
- `src/routeTree.gen.ts` (registrar rotas)

Sem mudanças em RLS de `appointments`/`suppliers` (já permitem insert público).
