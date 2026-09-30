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
├── supabase/migrations/           # Scripts SQL do banco (só na cópia local, fora do Git)
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

---

## 🔒 Banco de Dados e Sincronização em Nuvem
- **(PostgreSQL):** banco central com sincronização em tempo real.
- **Login:** Institucional.
