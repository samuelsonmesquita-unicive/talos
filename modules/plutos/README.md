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
margem   = [ticket × (1 − inadimplência) − ticket × imposto − custo_por_aluno] × (1 − repasse_polo)
PE_base  = ⌈ [custo_total_curso(Hermes) ÷ (duração_curso × 12)] ÷ margem ⌉
PE       = ⌈ PE_base × fator_evasão ⌉
```

Onde:
- **custo_total_curso**: soma de Professor + Mediador (Hermes)
- **duração_curso**: em anos
- **ticket**: ticket médio (mensalidade)
- **imposto**: alíquota sobre o faturado (devida mesmo quando o aluno não paga)
- **inadimplência**: mensalidades vencidas e não pagas ÷ total faturado
- **custo_por_aluno**: custo fixo por aluno/mês (boleto, AVA, editora), descontado antes do repasse
- **repasse_polo**: parte do polo sobre o que entrou, depois dos custos
- **fator_evasão**: acréscimo de alunos para compensar a evasão

Os valores dos parâmetros são confidenciais e ficam só no banco (`plutos_configuracao`).

## Setup

## Segurança

### RLS

- `plutos_inputs_curso`: staff pode ler/escrever
- `plutos_configuracao`: **sem policy de select** para `authenticated` (só via RPC admin)

## Fluxo de Uso

1. **Login**: Institucional
2. **Selecione curso**: lista do Hermes com custo total
3. **Preencha dados**: quantidade de disciplinas + ticket médio
4. **Calcule**: clique em "Calcular Ponto de Equilíbrio"
5. **Veja resultado**: PE (nº alunos) + investimento em disciplinas


- Payback do investimento em disciplinas
- Projeção de receita líquida
- Integração com Atena (mercado) para sugestões de ticket
- Exportação de relatórios
