# Élo — Prontuário de bolso

Aplicativo web (PWA) de fisioterapia, mobile-first. Fluxo completo no bolso:

**Login → Cadastro do paciente → Avaliação simples → Prontuário → Evolução → Prescrição de exercícios** (com link e envio por WhatsApp).

Feito com Vite + React. Os dados ficam salvos **no próprio aparelho** (localStorage) — não há servidor.

---

## Rodar localmente

Pré-requisito: [Node.js](https://nodejs.org) 18 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (ex.: `http://localhost:5173`).

Para gerar a versão de produção:

```bash
npm run build      # gera a pasta dist/
npm run preview    # testa a build localmente
```

---

## Instalar como app no celular (PWA)

Depois de publicado (em HTTPS), abra o site no celular e use **"Adicionar à tela inicial"**. Ele abre em tela cheia, como um app — daí o "de bolso".

---

## Publicar

### Opção 1 — Netlify (mais simples)
1. Suba este projeto para um repositório no GitHub.
2. Em [netlify.com](https://www.netlify.com) → **Add new site → Import an existing project** → escolha o repositório.
3. O `netlify.toml` já define tudo (build `npm run build`, publish `dist`). É só confirmar.

### Opção 2 — Vercel
1. Suba para o GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. A Vercel detecta o Vite automaticamente. Deploy.

### Opção 3 — GitHub Pages (já automatizado)
1. Suba para o GitHub na branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` builda e publica sozinho a cada push, já ajustando o caminho (`base`) para o nome do repositório.

> Em Netlify e Vercel o `base` padrão (`/`) já funciona. O ajuste de `base` é necessário apenas no GitHub Pages, e o workflow cuida disso.

---

## Estrutura

```
elo-prontuario/
├─ index.html
├─ vite.config.js          # React + PWA (manifest, service worker)
├─ netlify.toml
├─ .github/workflows/deploy.yml
├─ public/                 # ícones e favicon
└─ src/
   ├─ main.jsx
   ├─ App.jsx              # todo o app
   └─ index.css            # tema + utilitários
```

---

## Observações para virar produto

Este é um MVP funcional para testes reais. Para uso clínico em escala, os próximos passos são:

- **Login real** (o botão Google aqui é visual): integrar Firebase Auth, Supabase ou similar.
- **Backend / banco de dados**: hoje os dados são por aparelho (localStorage). Para sincronizar entre dispositivos e fazer backup, usar Supabase, Firebase ou um backend próprio.
- **Link do paciente**: gerar token único com expiração (carrega dado clínico) em vez de URL fixa.
- **LGPD**: termo de consentimento e política de privacidade antes de coletar dados de pacientes.
