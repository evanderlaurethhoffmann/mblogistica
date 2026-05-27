## Visão geral

Expansão grande do Portal Interno com 5 frentes integradas. Toda implementação reaproveita as tabelas existentes (`appointments`, `suppliers`, `blocked_dates`, `branches`, `profiles`, `user_roles`) e adiciona novas tabelas para docas, configurações operacionais e agendas fixas.

Acesso: tudo restrito a **Administrador** e **Conferente** (operator). Hoje só existe `admin | operator` — vou usar `operator` como "Conferente".

---

## 1. Migração de banco (uma só migration)

**Novos campos em `appointments`:**
- `protocol` (text, único, gerado por trigger `AG-YYYYMMDD-XXXX`)
- `dock_id` (uuid → docks, nullable)
- `nf_number` (text), `nf_access_key` (text), `nf_status` (text default 'Pendente')
- `palette_count` (int), `disposition` (text — Batida/Paletizada/Outro)
- `driver_name` (text), `carrier_name` (text — transportadora)
- `observations` (text)
- `refusal_reason_id` (uuid → refusal_reasons, nullable)

**Novas tabelas (todas com GRANT + RLS):**
- `docks` (name, status 'Ativa'|'Manutenção') — admin escreve, auth lê.
- `work_hours` (weekday 0-6 unique, enabled, start_time, end_time) — admin escreve, **leitura pública** (alimenta calendário do portal externo).
- `refusal_reasons` (label, active) — admin escreve, auth lê.
- `fixed_schedules` (supplier_id, dock_id, weekday, time) — admin escreve, **leitura pública** (para bloquear no portal externo).
- `dock_blocks` (dock_id, blocked_date, blocked_time, reason, kind 'block'|'reserve', manual_supplier_label) — admin escreve, auth lê.
- Estender `suppliers`: `active` boolean default true.
- Estender `branches`: `cnpj` text nullable.

**Função/trigger:** `gen_protocol()` para preencher `protocol` no insert.

---

## 2. Tela: `/recebimento` — Aprovações (reformulada)

Mantém as 3 abas, mas a aba **Pendentes/Histórico** ganha:
- Barra de filtros: busca (nome fantasia/CNPJ), select de status (Todos/Pendente/Confirmado/Recusado), data inicial e data final.
- Tabela com colunas: Data/Hora · Fornecedor (nome+CNPJ) · Tipo Carga + Veículo (Badges) · Volumes · Duração · Status (badge colorido) · Ações (ícone olho).
- Linha inteira clicável → abre modal de detalhes (ver §3).

---

## 3. Modal: Detalhes do Agendamento (2 colunas)

Componente reutilizável `AppointmentDetailsDialog` usado em Aprovações, Painel de Docas e Conferência de NFs.

**Coluna esquerda (3 blocos):**
- Dados da Solicitação: Protocolo, Solicitada Em, Solicitada Para, Tipo de Carga, CNPJ, Razão Social/Nome Fantasia, E-mail, WhatsApp, Observações.
- Dados da Carga: Disposição, Volumes, Paletes, Tipo Veículo, Placa, Motorista, Contato, Transportadora.
- Alocação de Doca: Agendado Para, Horário, **seletor de Doca** (alimentado por `docks` ativas).

**Coluna direita:**
- Notas Fiscais e Anexos: Nº NF, botão para baixar XML/PDF anexado (`nf-uploads`).

**Rodapé fixo:**
- **Aprovar** (exige doca selecionada — valida conflito de doca/horário) → status Confirmado.
- **Alterar Tempo** (abre input inline do `estimated_minutes`).
- **Recusar** → seleciona motivo do dropdown (`refusal_reasons`) + textarea de complemento obrigatório → status Recusado.

---

## 4. Tela: `/docas` — Painel de Ocupação de Docas

- Header: date picker (default hoje) + setas anterior/próximo.
- Grid: linhas = docas ativas, colunas = horas (lidas de `work_hours` do dia da semana selecionado).
- Cada célula:
  - **Ocupada** (appointment Confirmado com dock_id+data+hora): bloco azul com nome fantasia → clique abre `AppointmentDetailsDialog`.
  - **Bloqueada/Reservada** (`dock_blocks`): cinza listrado com label → clique abre popover "Desbloquear".
  - **Livre**: clique abre popover com botões "Bloquear Horário" e "Reservar Internamente" (input motivo).

---

## 5. Tela: `/notas-fiscais` — Conferência de Notas Fiscais

- Filtros: busca (nf_number/nf_access_key), select status NF, período (data prevista).
- Tabela: Nº NF · Fornecedor · Data prevista · Volumes · Arquivo (badge XML/PDF clicável → URL assinada) · Status agendamento.
- Linha clicável → `AppointmentDetailsDialog`.

---

## 6. Tela: `/configuracoes` — Cadastros (admin-only, em abas)

Reaproveita a rota existente `/configuracoes` ou cria nova `/configuracoes-recebimento`. Vou **estender** a atual com Tabs:
1. **Empresas (Fornecedores)** — CRUD de `suppliers` (com Status Ativo/Inativo).
2. **Usuários** — usa fluxo existente em `/usuarios` (link interno).
3. **Filiais** — CRUD de `branches` (Número, Nome, CNPJ).
4. **Horários de Trabalho** — grade Seg–Dom com checkbox + inputs start/end.
5. **Motivos de Recusa** — CRUD simples de `refusal_reasons`.
6. **Docas** — CRUD de `docks` (Nome, Status).
7. **Agendas Fixas** — CRUD de `fixed_schedules` (fornecedor, doca, dia da semana, horário).

---

## 7. Integração com o portal externo (`/portal`)

O calendário do fornecedor passa a:
- Ler `work_hours` para gerar slots por dia da semana (em vez do hard-code 08–17h).
- Bloquear horários presentes em `fixed_schedules` e `dock_blocks` do dia escolhido.

---

## 8. Navegação (Layout.tsx)

Adicionar itens no menu lateral (admin + operator): **Recebimento**, **Docas**, **Notas Fiscais**. **Configurações** continua admin-only.

---

## Detalhes técnicos

- Tudo em `createServerFn` quando precisar de joins/validação cruzada (ex.: aprovar com checagem de conflito de doca). CRUDs simples continuam pelo client supabase + RLS.
- Reuso do `CrudList` quando der; telas com lógica específica recebem componente próprio.
- Tipagem: como `src/integrations/supabase/types.ts` é auto-gerada, vou referenciar campos novos via `as any` temporário até a migração rodar (padrão atual do projeto).

---

## Ordem de execução

1. Rodar migration (estrutura completa).
2. Criar `AppointmentDetailsDialog` reusável.
3. Refatorar `/recebimento` (filtros + nova tabela + novo modal).
4. Criar `/docas` e `/notas-fiscais` + rotas.
5. Estender `/configuracoes` com as 7 abas.
6. Atualizar `/portal` para consumir `work_hours`/`fixed_schedules`/`dock_blocks`.
7. Atualizar menu em `Layout.tsx`.

Pelo tamanho, vou entregar em uma única leva. Posso seguir?