# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Next.js 14 (App Router) TypeScript application called "Scholarship Workflow Manager". It uses Tailwind CSS for styling and has Firebase as a declared dependency (not yet configured).

### Development Commands

All standard commands are in `package.json`:

- **Dev server**: `npm run dev` (port 3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Start production**: `npm run start`

### Non-obvious Notes

- **No lockfile convention**: The repo has no committed lockfile. `npm install` generates `package-lock.json` locally.
- **ESLint config**: `.eslintrc.json` must exist with `"extends": "next/core-web-vitals"` for `npm run lint` to run non-interactively. Without it, Next.js prompts for interactive ESLint setup.
- **Firebase**: `firebase` is a declared dependency but has no configuration or initialization code yet. No `.env` or Firebase config files are needed at this stage.
- **tsconfig.json auto-modification**: Next.js modifies `tsconfig.json` on first run (adds `incremental`, `.next/types`, and the `next` plugin). This is expected behavior.
- **No `.gitignore`**: The repo lacks a `.gitignore`. Be careful not to commit `node_modules/` or `.next/`.
