# Projeto Talos
### Plataforma Integrada de Automação e Inteligência de Novos Negócios
**Departamento de Novos Negócios &bull; Centro Universitário Cidade Verde (Unicive)**

---

## 🏛️ Visão Geral

O **Projeto Talos** é o ecossistema integrado de automação, dimensionamento e inteligência operacional do **Departamento de Novos Negócios** da Unicive.

O objetivo do Talos é centralizar em uma única arquitetura moderna as ferramentas de planejamento, viabilidade econômico-financeira, simulação de custos docentes e parametrizações acadêmicas necessárias para o lançamento e a sustentabilidade de novos cursos e projetos educacionais.

---

## 🏗️ Estrutura do Monorepo

O repositório é organizado em módulos independentes sob o diretório `modules/`:

```
talos/
├── README.md                      # Documentação Geral do Projeto Talos (este arquivo)
├── .gitignore                     # Arquivos e pastas ignorados globalmente
├── docs/                          # Manuais de governança e arquitetura geral
│   └── arquitetura-talos.md
├── portal/                        # Página inicial do Talos (lista dos módulos)
├── supabase/migrations/           # Banco SQL
└── modules/
    ├── hermes/                    # MÓDULO HERMES: Gestão de Demandas & Matriz de Custo Docente
    │   ├── README.md              # Documentação específica do Módulo Hermes
    │   ├── package.json
    │   ├── vite.config.ts
    │   └── src/
    │
    ├── cronos/                    # [Planejado] Cronograma & Lançamento de Novos Cursos
    ├── plutos/                    # [Planejado] Análise de Viabilidade Econômica & Precificação
    └── atena/                     # [Planejado] Inteligência de Mercado & Portfólio de Cursos
```

---

## ⚡ Módulos do Ecossistema Talos

| Módulo | Nome |
| :--- | :--- | :--- | :--- |
| **Hermes** | *Gestão de Demandas* | 
| **Plutos** | *Viabilidade & Custo* | 
| **Cronos** | *Esteira de Lançamento* | 
| **Atena** | *Inteligência de Mercado* | 

---

## 🚀 Como Iniciar um Módulo Localmente

Cada módulo possui seu próprio ciclo de desenvolvimento independente. Para iniciar o **Módulo Hermes**:

---

## 🔐 Padrões de Segurança & Nuvem

- **Autenticação & Banco de Dados:** Supabase (Google Workspace `@unicive.edu.br` + PostgreSQL com RLS).

---

## 👥 Mantenedores

- **Departamento de Novos Negócios — Unicive**
- Contato: `samuelson.mesquita@unicive.edu.br`
