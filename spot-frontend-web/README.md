# SPOT Frontend Web

Web application cho SPOT platform, xây dựng với Next.js.

## Status

Barely scaffolded — only `src/app/layout.tsx`/`page.tsx` have content, and
`next build`/`docker build` currently fail (`globals.css` and several config
files don't exist yet: `tsconfig.json`, `next.config.js`,
`tailwind.config.js`, `postcss.config.js`). See `CLAUDE.md` in this
directory for the full picture before assuming any command below works.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start development
npm run dev

# Build for production
npm run build
npm start
```

## Project Structure

```
src/
├── app/            # App Router pages — only layout.tsx + page.tsx exist
│   ├── admin/      # empty
│   └── auth/       # empty
├── components/{auth,booking,common,matchmaking,venue,voice}/  # empty
├── hooks/ services/ state/ styles/ types/ utils/               # empty
tests/{e2e,integration,unit}/    # empty, no test files yet
```

## API Integration

Base URL: `http://localhost:3000/api`. No `src/services/api.client.ts` file
exists yet — the API client itself hasn't been written.

## Testing

```bash
npm test
npm run test:watch
```
