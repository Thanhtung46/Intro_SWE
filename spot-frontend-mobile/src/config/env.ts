// spot-frontend-mobile has no env-loading library wired up yet (see CLAUDE.md),
// so this falls back to the same default as .env.example instead of reading process.env.
export const API_URL = 'http://localhost:3000/api';

// spot-backend has no package.json/API yet — hardcoded true until a real
// backend exists. Flip to false to point authService at the real API_URL,
// no UI code changes needed.
export const USE_MOCK_API = true;
