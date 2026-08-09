# SPOT Admin Console

Admin dashboard cho SPOT platform, xây dựng với React + Vite.

## Status

Scaffolded and the most complete of the three frontends — `docker build`
succeeds end-to-end here (verified). `npm run lint` fails today though: no
`.eslintrc*`/`eslint.config.js` is committed despite ESLint being wired into
`package.json`. See `CLAUDE.md` in this directory for details.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── App.tsx / main.tsx / App.css / index.css   # real content
├── assets/          # hero.png, vite.svg, react.svg
tests/               # empty, no test files yet
```

## Features

- User management
- Venue management
- Booking management
- Analytics & reporting
- System settings
