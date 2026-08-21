import pool from '../../../shared/database/pool.js';
import { TOURNAMENT_STATUSES } from '../../../shared/constants/tournaments.js';
import * as tournamentRepository from '../repository/tournament.repository.js';
import * as tournamentNotification from './tournament-notification.service.js';

export async function processRegistrationDeadlines() {
  const client = await pool.connect();
  let processed = 0;
  try {
    await client.query('BEGIN');
    const rows = await tournamentRepository.listExpiredRegistrationOpen(client);
    for (const row of rows) {
      await tournamentRepository.updateStatus(
        client,
        row.tournament_id,
        TOURNAMENT_STATUSES.CANCELLED,
      );
      const captainIds = await tournamentRepository.listAcceptedCaptainUserIds(
        client,
        row.tournament_id,
      );
      await tournamentNotification.notifyTournamentCancelled(
        row,
        [row.organizer_user_id, ...captainIds],
        'REGISTRATION_DEADLINE',
      );
      processed += 1;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return processed;
}

export async function processTournamentStarts() {
  const client = await pool.connect();
  let processed = 0;
  try {
    await client.query('BEGIN');
    const rows = await tournamentRepository.listReadyToStart(client);
    for (const row of rows) {
      await tournamentRepository.updateStatus(
        client,
        row.tournament_id,
        TOURNAMENT_STATUSES.ACTIVE,
      );
      processed += 1;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return processed;
}

export async function processTournamentEnds() {
  const client = await pool.connect();
  let processed = 0;
  try {
    await client.query('BEGIN');
    const rows = await tournamentRepository.listReadyToComplete(client);
    for (const row of rows) {
      await tournamentRepository.updateStatus(
        client,
        row.tournament_id,
        TOURNAMENT_STATUSES.COMPLETED,
      );
      processed += 1;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return processed;
}

export async function processTournamentLifecycle() {
  const expired = await processRegistrationDeadlines();
  const started = await processTournamentStarts();
  const ended = await processTournamentEnds();
  return { expired, started, ended };
}
