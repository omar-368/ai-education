# AI Education

A simple AI quiz app. Choose a subject and either MCQ or one-answer questions, then answer an unlimited stream of questions generated through OpenRouter.

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Add your OpenRouter credentials to `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-real-key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Never prefix the API key with `VITE_`. The browser calls serverless routes under `/api`; the key remains on the server.

## Run locally

Use Vercel development mode so both the Vite frontend and serverless API routes run:

```powershell
npx vercel dev
```

## Build

```powershell
npm run build
```

## Deploy

Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in the Vercel project's environment variables, then deploy:

```powershell
npx vercel@latest deploy --prod
```

The app saves only the user's selected subject and question type in local storage. No study material or account is required.
