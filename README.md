# AI Education

A simple AI quiz app. Choose a subject and either MCQ or one-answer questions, then answer an unlimited stream of questions generated through OpenAI.

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Add your OpenAI credentials to `.env.local`:

```env
OPENAI_API_KEY=sk-proj-your-real-key
OPENAI_MODEL=gpt-5-mini
```

Never prefix the API key with `VITE_`. The browser calls serverless routes under `/api`; the key remains on the server.
`OPENAI_MODEL` is optional and defaults to `gpt-5-mini`, a fast, cost-efficient model.

## Run locally

Use Vercel development mode so both the Vite frontend and serverless API routes run:

```powershell
npm run dev:vercel
```

## Quality checks

```powershell
npm run check
npm run build
npm audit
```

## Deploy

Add `OPENAI_API_KEY` and (optionally) `OPENAI_MODEL` in the Vercel project's environment variables, then deploy:

```powershell
npx vercel@latest deploy --prod
```

The app stores quiz preferences and player progression in local storage. No study material or account is required.
