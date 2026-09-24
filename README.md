# 🏛️ Projeto Talos — Ecossistema de Novos Negócios Unicive

> **Repositório Oficial:** `https://github.com/samuelsonmesquita-unicive/talos.git`  
> **Departamento de Novos Negócios — Centro Universitário Cidade Verde (Unicive)**  
> **Mantenedor:** Samuelson Martins Mesquita (`samuelson.mesquita@unicive.edu.br`)

---

## 🧭 Estrutura do Repositório (Monorepo)

O projeto **Talos** é desenhado em arquitetura de módulos autônomos para suportar todas as operações e ferramentas da área de Novos Negócios da Unicive:

```
talos/
├── README.md                      # Documentação Geral do Projeto Talos
├── .gitignore                     # Arquivos ignorados pelo Git (node_modules, .env, etc.)
├── portal/                        # Página inicial do Talos (lista dos módulos)
├── supabase/migrations/           # Banco de dados compartilhado (SQL): login, perfis e tabelas de cada módulo
│
└── modules/
    ├── hermes/                    # [ATIVO] Módulo Hermes: Gestão de Demandas & Matriz de Custo Docente EaD
    │   ├── src/                   # Código fonte React + TypeScript + Tailwind
    │   ├── package.json           # Dependências e scripts do Hermes
    │   ├── vite.config.ts         # Configuração de build Vite
    │   └── README.md              # Documentação e regras de cálculo do Módulo Hermes
    │
    ├── plutos/                    # [Planejado] Viabilidade Econômico-Financeira & Break-Even
    ├── cronos/                    # [Planejado] Esteira de Implantação e Cronograma de Novos Cursos
    └── atena/                     # [Planejado] Inteligência Competitiva de Mercado & Portfólio
```

---

## ⚡ Módulo Hermes (Gestão de Demandas & Matriz Salarial)

O **Módulo Hermes** é o núcleo de dimensionamento docente e cálculo orçamentário para cursos de graduação e pós-graduação EaD da Unicive.

A tabela salarial, os encargos e todos os custos são **confidenciais**: ficam só no banco de dados, são calculados no servidor e só o perfil `admin` tem acesso aos valores.

---

## 📋 Guia de Inicialização e Desenvolvimento Local

### 1. Clonar o repositório
```bash
git clone https://github.com/samuelsonmesquita-unicive/talos.git
cd talos
```

### 2. Rodar o Módulo Hermes
```bash
cd modules/hermes
npm install
npm run dev
```

Acesse a aplicação no navegador em `http://localhost:3000/talos/hermes/`.

### 3. Build para Produção
```bash
npm run build
```

---

## 🔒 Banco de Dados e Sincronização em Nuvem
- **Supabase (PostgreSQL):** banco central com sincronização em tempo real. Custos, encargos e status são calculados no banco (triggers), não no navegador.
- **Login:** Google Workspace, restrito a contas `@unicive.edu.br` (validado no servidor).
- **Perfis:** `staff` cadastra e edita; `admin` também altera a tabela salarial e exclui registros e cursos. As permissões são aplicadas pelo banco (RLS e funções `admin_*`).
- **Configuração local:** copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca coloque a chave secreta (service_role) no projeto.
