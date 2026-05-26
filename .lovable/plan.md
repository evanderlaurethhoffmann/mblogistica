## Portal de Agendamento do Fornecedor + Painel Adm de Recebimento

Vou implementar em duas partes integradas, usando o Lovable Cloud (Supabase) já conectado.

---

### Parte 1 — Banco de Dados (migração)

Criar 3 tabelas novas + 1 bucket de storage:

**`suppliers`** (cadastro do fornecedor — login simples por CNPJ + e-mail, sem Supabase Auth)
- `id`, `nome_fantasia`, `razao_social`, `cnpj` (unique), `whatsapp`, `email`, `created_at`

**`appointments`** (solicitações de agenda)
- `id`, `supplier_id` (FK), `vehicle_type` (toco/truck/carreta/van/outro), `vehicle_plate`, `cargo_type` (paletizada/batida/quimica/outro), `driver_contact`
- `nf_file_url` (path no bucket), `nf_volumes` (int)
- `scheduled_date` (date), `scheduled_time` (time), `estimated_minutes` (int)
- `status` ('Pendente' | 'Confirmado' | 'Recusado'), `refusal_reason`
- `created_at`, `updated_at`

**`blocked_dates`** (dias bloqueados pelo admin)
- `id`, `blocked_date` (date unique), `reason`, `created_at`

**Bucket `nf-uploads`** (público para leitura via URL assinada; uploads anônimos permitidos).

**RLS:**
- `suppliers`: insert/select anônimo permitido (cadastro público); admin total.
- `appointments`: insert anônimo permitido; select próprio pelo supplier_id via portal (sem auth, então leitura admin-only via app + select público apenas dos horários ocupados confirmados para o calendário); admin gerencia tudo.
- `blocked_dates`: select anônimo (calendário); admin escreve.
- Bucket `nf-uploads`: insert anônimo; select admin + URLs assinadas.

---

### Parte 2 — Portal Público do Fornecedor

**Nova rota pública `/portal`** (fora do `Layout` com login). Adicionar exceção em `src/components/Layout.tsx` ou montar rota independente que não usa o Layout.

Fluxo em etapas (wizard de uma página):

1. **Identificação do Fornecedor:** form com Nome Fantasia, Razão Social, CNPJ (com máscara), WhatsApp, E-mail. Ao submeter, faz `upsert` por CNPJ na tabela `suppliers` e guarda `supplier_id` no state.

2. **Informações da Carga:** Tipo de Veículo (Select), Placa, Tipo de Carga (Select), Contato do Motorista, upload de NF (.xml/.pdf — `supabase.storage.from('nf-uploads').upload`), Quantidade de Volumes.

3. **Agenda:** Calendar shadcn limitado a hoje..hoje+15. Dias bloqueados (de `blocked_dates`) e dias com horário 100% ocupado (de `appointments` Confirmado) ficam disabled. Ao escolher dia, lista slots 08:00–17:00 (de 1h em 1h); slots já confirmados aparecem desabilitados. Campo "Tempo estimado de descarga (min)". Botão **Enviar Solicitação** → insert em `appointments` com status 'Pendente'.

4. Tela final de sucesso com protocolo (id curto).

---

### Parte 3 — Painel Admin "Gestão de Recebimento"

**Nova rota protegida admin `/recebimento`** com 3 abas:

1. **Pendentes:** tabela com solicitações `Pendente`. Clicar abre Dialog com todos os dados + link "Baixar NF" (URL assinada). Ações:
   - **Aceitar** (com input editável de "tempo de descarga" antes de confirmar) → status `Confirmado`.
   - **Recusar** → textarea obrigatório de motivo → status `Recusado`.

2. **Confirmados / Histórico:** tabela com filtros por status e data.

3. **Configuração de Dias:** calendário (próximos 15 dias) onde admin marca/desmarca dias como bloqueados (`blocked_dates`). Insert/delete imediato.

Adicionar item de menu "Recebimento" no `Layout.tsx` (visível só para admin).

---

### Notas técnicas

- O portal público não usa Supabase Auth — identificação é por CNPJ + e-mail (validação leve). RLS permite insert anônimo controlado nas 2 tabelas relevantes.
- Upload de NF vai direto do browser para storage usando o anon key.
- Validação com `zod` em ambos os lados.
- Calendário usa `react-day-picker` (shadcn Calendar) com `disabled` dinâmico.
- Slots de horário gerados client-side (08:00–17:00, 1h) e cruzados com `appointments` Confirmados naquele dia.

Posso seguir e implementar?
