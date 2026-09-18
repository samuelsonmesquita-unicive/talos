# 🚀 Guia de Implementação e Push para o GitHub

Este guia descreve o passo a passo para conectar e enviar o código deste projeto diretamente para o seu repositório:
👉 **`https://github.com/samuelsonmesquita-unicive/talos.git`**

---

## 🛠️ Opção 1: Configuração do Monorepo Talos (Recomendada)

Se você deseja manter o projeto organizado na estrutura oficial da Unicive (`talos/modules/hermes`):

### Passo 1: Baixar os arquivos do Google AI Studio
1. No canto superior direito da tela do AI Studio, clique nos **três pontinhos verticais (`⋮`)** ou em **Settings**.
2. Clique em **Download as ZIP** e salve o arquivo no seu computador.
3. Extraia o arquivo ZIP.

---

### Passo 2: Clonar o seu repositório vazio do GitHub
Abra o seu terminal (Prompt de Comando, PowerShell ou Git Bash) e execute:

```bash
# 1. Clone o seu repositório GitHub recém-criado
git clone https://github.com/samuelsonmesquita-unicive/talos.git

# 2. Acesse a pasta do repositório
cd talos

# 3. Crie a pasta do módulo hermes
mkdir -p modules/hermes
```

---

### Passo 3: Copiar o código para dentro do módulo
1. Copie todos os arquivos descompactados do ZIP para dentro da pasta `talos/modules/hermes/`.
2. *(Opcional)* Copie o arquivo `README.md` que está na raiz do ZIP para a raiz do seu repositório `talos/README.md`.

---

### Passo 4: Enviar para o GitHub
No terminal, dentro da pasta `talos`, digite:

```bash
# Adicionar todos os arquivos
git add .

# Criar o commit inicial com a mensagem padronizada
git commit -m "feat(hermes): implementação inicial do módulo hermes com encargos da folha (+50,44%)"

# Garantir a branch main
git branch -M main

# Enviar para o GitHub
git push -u origin main
```

---

## ⚡ Opção 2: Subir Diretamente na Raiz do Repositório (Mais Rápido)

Caso prefira que este código fique direto na raiz do repositório `talos`:

1. Baixe o **ZIP** pelo menu de configurações do AI Studio (**Download as ZIP**).
2. Extraia o ZIP em uma pasta do seu computador (ex: `C:\Projetos\talos` ou `~/talos`).
3. Abra o terminal nessa pasta extraída e execute:

```bash
git init
git branch -M main
git remote add origin https://github.com/samuelsonmesquita-unicive/talos.git
git add .
git commit -m "feat: código inicial do Módulo Hermes com encargos da folha (+50,44%)"
git push -u origin main --force
```

---

## 🔄 Como sincronizar alterações futuras

Sempre que fizer novas alterações no AI Studio e quiser atualizar o repositório:
1. Baixe o ZIP atualizado ou copie os arquivos modificados.
2. No terminal da sua pasta local:
```bash
git add .
git commit -m "feat: atualização de regras ou interface"
git push origin main
```
