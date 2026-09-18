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
│
└── modules/
    ├── hermes/                    # [ATIVO] Módulo Hermes: Gestão de Demandas & Matriz de Custo Docente EaD
    │   ├── src/                   # Código fonte React + TypeScript + Tailwind
    │   ├── package.json           # Dependências e scripts do Hermes
    │   ├── vite.config.ts         # Configuração de build Vite
    │   ├── firestore.rules        # Regras de segurança em nuvem (Firestore)
    │   └── README.md              # Documentação e regras de cálculo do Módulo Hermes
    │
    ├── plutos/                    # [Planejado] Viabilidade Econômico-Financeira & Break-Even
    ├── cronos/                    # [Planejado] Esteira de Implantação e Cronograma de Novos Cursos
    └── atena/                     # [Planejado] Inteligência Competitiva de Mercado & Portfólio
```

---

## ⚡ Módulo Hermes (Gestão de Demandas & Matriz Salarial)

O **Módulo Hermes** é o núcleo de dimensionamento docente e cálculo orçamentário para cursos de graduação e pós-graduação EaD da Unicive.

### 📐 Regras de Cálculo Salarial e Encargos da Folha

Para cada carga horária semanal ($10h$, $20h$ ou $40h$) e cargo (*Professor* ou *Mediador*), o custo mensal do docente é computado a partir do salário base acrescido das provisões trabalhistas e dos encargos patronais:

$$ \text{Custo Mensal} = \text{Salário Base} \times \left(1 + \text{Alíquota Trabalhista} + \text{Alíquota Encargos}\right) $$

- **Provisões Trabalhistas ($19{,}44\%$):**
  - $13º$ Salário: $\frac{1}{12} \approx 8{,}333\%$
  - Férias: $\frac{1}{12} \approx 8{,}333\%$
  - $1/3$ Constitucional de Férias: $\frac{1}{12} \times \frac{1}{3} = \frac{1}{36} \approx 2{,}777\%$
  - *Subtotal Trabalhista:* $\frac{7}{36} \approx 19{,}444\%$
- **Encargos Sociais e Previdenciários ($31{,}00\%$):**
  - INSS Patronal: $8{,}00\%$
  - Encargos Adicionais da Folha: $23{,}00\%$
  - *Subtotal Encargos:* $31{,}00\%$
- **Acréscimo Total da Folha:** $+50{,}444\%$ sobre o salário base (fator $\approx 1{,}50444$).

O custo semestral de cada demanda é obtido por:
$$ \text{Custo Semestre} = \text{Quantidade} \times \text{Custo Mensal c/ Encargos} \times 6\text{ meses} $$

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

Acesse a aplicação no navegador em `http://localhost:3000`.

### 3. Build para Produção
```bash
npm run build
```

---

## 🔒 Banco de Dados e Sincronização em Nuvem
- **Firebase Firestore:** Integrado com sincronização em tempo real e offline-first.
- **Parametrizações Salariais:** Modificação de valores protegida por autenticação institucional.
