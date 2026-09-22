# Plutos — Viabilidade & Custo

Módulo de análise de **Ponto de Equilíbrio** e viabilidade financeira para cursos EaD. Calcula o número mínimo de alunos pagantes necessários para cobrir os custos de docência (Professor + Mediador) definidos no módulo Hermes, considerando a taxa de evasão.

## Funcionalidades

- **Seleção de Curso**: escolha um curso já cadastrado no Hermes
- **Entrada de Dados**: 
  - Quantidade de disciplinas a produzir (investimento)
  - Ticket médio (mensalidade) — informação confidencial
- **Cálculo automático** de Ponto de Equilíbrio (PE)
- **Resultado seguro**: expõe apenas o PE e investimento, nunca a taxa de evasão ou ticket médio

## Fórmula do Ponto de Equilíbrio

```
PE = [custo_total_curso(Hermes) ÷ (duração_curso × 12)] ÷ (ticket_médio − 5) × fator_evasão
```

Onde:
- **custo_total_curso**: soma de Professor + Mediador (Hermes)
- **duração_curso**: em anos
- **ticket_médio**: valor da mensalidade (confidencial)
- **5**: custo variável por aluno/mês (plataforma, boleto, editora)
- **fator_evasão**: taxa de evasão 2026 (confidencial, default 1,3592)

## Setup

### 1. Migração do Banco (Supabase)

```bash
# Via CLI
supabase db push

# Ou via SQL editor Supabase:
# Copiar conteúdo de supabase/migrations/0008_plutos_schema.sql
```

Cria:
- `plutos_configuracao`: tabela de configuração (sem acesso direto para `authenticated`)
- `plutos_inputs_curso`: inputs e resultados por curso
- Funções de cálculo com `security definer`
- Triggers de sincronização com Hermes

### 2. Frontend

```bash
cd modules/plutos
npm install
npm run dev
```

Acessa em `http://localhost:3001`.

## Variáveis de Ambiente

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Copia de `.env.example` ou reusa as mesmas do Hermes (mesmo Supabase).

## Segurança

### Dados Confidenciais

Armazenados em `plutos_configuracao`, **nunca expostos ao cliente**:
- `fator_evasao`: taxa de evasão (1,3592 para 2026)
- `custo_variavel_aluno`: custo por aluno (R$ 5)
- `ticket_medio`: do usuário (guardado em `plutos_inputs_curso`, mas nunca retornado ao cliente)

A função `plutos_fn_calcular_pe()` é `security definer` — lê os valores confidenciais do servidor e retorna apenas o resultado final (PE).

### RLS

- `plutos_inputs_curso`: staff pode ler/escrever
- `plutos_configuracao`: **sem policy de select** para `authenticated` (só via RPC admin)

## Fluxo de Uso

1. **Login**: Google Workspace (@unicive.edu.br)
2. **Selecione curso**: lista do Hermes com custo total
3. **Preencha dados**: quantidade de disciplinas + ticket médio
4. **Calcule**: clique em "Calcular Ponto de Equilíbrio"
5. **Veja resultado**: PE (nº alunos) + investimento em disciplinas

## Endpoints

### Supabase (cliente)

```ts
// Lê cursos com custo total (Hermes)
const { data: cursos } = await supabase
  .from('hermes_cursos')
  .select('id, nome_curso, grau, duracao_curso, custo_total_curso, dados_parciais')

// Upsert inputs e recalcula PE (trigger)
const { data: resultado } = await supabase
  .from('plutos_inputs_curso')
  .upsert({
    curso_id: 'curso_id',
    quantidade_disciplinas: 5,
    ticket_medio: 2500.00
  })
  .select('curso_id, ponto_equilibrio, investimento_disciplinas, dados_hermes_parciais')
  .single()
```

### Admin RPC (confidencial)

```sql
select public.plutos_admin_update_config(
  5445.25,     -- novo custo_disciplina
  5.00,        -- novo custo_variavel_aluno
  1.3592       -- novo fator_evasao (ex: 2027)
);
```

Requer `role = 'admin'`.

## Build

```bash
npm run build
npm run lint  # tsc --noEmit
```

Saída: `dist/` pronto para deploy em `/talos/plutos/` (GitHub Pages).

## Status

🟢 **Em Desenvolvimento** — funcionalidades básicas implementadas.

Próximas etapas (roadmap):
- Payback do investimento em disciplinas
- Projeção de receita líquida
- Integração com Atena (mercado) para sugestões de ticket
- Exportação de relatórios
