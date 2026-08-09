# SPOT Backend

Backend API cho nền tảng SPOT (Sport Pitch Online Ticketing).

## Status

**Not runnable yet — no `package.json` exists in this directory.** Only
`src/server.js`, `src/app.js`, and `src/shared/config/env.js` have real
content; every domain folder under `src/domains/` is an empty scaffold. See
`CLAUDE.md` in this directory for the full picture.

## Quick Start (once `package.json` exists)

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env với local values

# Start development
npm run dev

# Run tests
npm test

# Run migrations
npm run migrate
```

## Project Structure

Domain-driven under `src/domains/<name>/{controller,dto,entity,repository,service}/`
— see `CLAUDE.md` for the current (mostly empty) tree.

## API Documentation

- Base URL: `http://localhost:3000/api`
- Auth: JWT tokens in Authorization header

## Testing

```bash
npm test                # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## Docker

A `Dockerfile` is included, but `docker build` fails today at `npm ci`
because there's no `package.json` yet — same blocker as above.