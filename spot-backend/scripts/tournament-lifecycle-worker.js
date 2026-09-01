import { processTournamentLifecycle } from '../src/domains/tournaments/service/tournament-lifecycle.service.js';

const result = await processTournamentLifecycle();
console.log('Tournament lifecycle processed:', result);
