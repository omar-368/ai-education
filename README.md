# AI Education

A polished, adaptive study app that turns pasted notes into unlimited exam-style questions. It tracks difficulty, weak topics, scores, history, and flashcard confidence in the browser while keeping the OpenRouter API key securely in serverless functions.

## Requirements

- Node.js 20 or newer
- An [OpenRouter API key](https://openrouter.ai/settings/keys)
- Vercel CLI for full local API testing (included as a development dependency)

## Install

```powershell
cd C:\Users\User\Desktop\Projects\ai-education
npm install
```

Copy `.env.example` to `.env.local` and replace the placeholder key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-real-key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Never add `VITE_` to the API key variable. Vite variables are exposed to frontend code. `.env.local` is already ignored by Git.

## Local development

For frontend-only UI development:

```powershell
npm run dev
```

For the complete app, including `/api` serverless functions:

```powershell
npm run dev:vercel
```

The first Vercel CLI run may ask you to sign in and link a local project. The app is normally available at `http://localhost:3000`.

## Production build

```powershell
npm run build
npm run preview
```

## Deploy to Vercel

1. Push the `ai-education` folder to a Git repository.
2. Import the repository in Vercel.
3. Keep the detected Vite build settings.
4. Open **Project Settings → Environment Variables**.
5. Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
6. Deploy or redeploy.

The browser calls only `/api/generate-question`, `/api/grade-answer`, and `/api/explain-simple`. The API key is read from `process.env.OPENROUTER_API_KEY` on the server.

## Storage

Study material and progress are saved in `localStorage`. A clean placeholder adapter is included for a future Supabase migration; authentication is intentionally not implemented.
