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
└── modules/
    ├── hermes/                    # MÓDULO HERMES: Gestão de Demandas & Matriz de Custo Docente
    │   ├── README.md              # Documentação específica do Módulo Hermes
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── firestore.rules
    │   └── src/
    │
    ├── cronos/                    # [Planejado] Cronograma & Lançamento de Novos Cursos
    ├── plutos/                    # [Planejado] Análise de Viabilidade Econômica & Precificação
    └── atena/                     # [Planejado] Inteligência de Mercado & Portfólio de Cursos
```

---

## ⚡ Módulos do Ecossistema Talos

| Módulo | Nome | Finalidade Principal | Status |
| :--- | :--- | :--- | :--- |
| **Hermes** | *Gestão de Demandas* | Dimensionamento acadêmico por semestre (Pedagógico e Estágio) e cálculo automático da matriz salarial de Professores e Mediadores EAD. | 🟢 **Ativo / Em Produção** |
| **Plutos** | *Viabilidade & Custo* | Análise de ponto de equilíbrio (Break-even), projeção de receita líquida e viabilidade financeira. | 🟡 *Planejado* |
| **Cronos** | *Esteira de Lançamento* | Acompanhamento do pipeline de criação de novos cursos junto aos órgãos reguladores e setores internos. | 🟡 *Planejado* |
| **Atena** | *Inteligência de Mercado* | Mapeamento de concorrência, demanda regional e tendências de novos cursos. | 🟡 *Planejado* |

---

## 🚀 Como Iniciar um Módulo Localmente

Cada módulo possui seu próprio ciclo de desenvolvimento independente. Para iniciar o **Módulo Hermes**:

```bash
# 1. Navegue até o módulo
cd modules/hermes

# 2. Instale as dependências
npm install

# 3. Inicie em modo desenvolvimento
npm run dev
```

Acesse no navegador: `http://localhost:3000`.

---

## 🔐 Padrões de Segurança & Nuvem

- **Autenticação & Banco de Dados:** Firebase Firestore integrado com regras granulares (`firestore.rules`).
- **Parametrização Salarial:** Acesso a tabelas de piso, encargos e DSR restrito por senha institucional.
- **Versionamento:** Commits seguindo o padrão *Conventional Commits* (`feat:`, `fix:`, `refactor:`, `docs:`).

---

## 👥 Mantenedores

- **Departamento de Novos Negócios — Unicive**
- Contato: `samuelson.mesquita@unicive.edu.br`
