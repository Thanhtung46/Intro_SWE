import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { USER_ROLES, PG_INT4_MAX } from '../../../shared/constants/auth.js';
import {
  TOURNAMENT_JOIN_REQUEST_STATUSES,
  TOURNAMENT_MINE_SECTIONS,
  TOURNAMENT_MINE_TABS,
  TOURNAMENT_STATUSES,
  canOrganizerCancel,
  findActiveLockedPatchFields,
  isTournamentPatchLockedStatus,
} from '../../../shared/constants/tournaments.js';
import * as userRepository from '../../auth/repository/user.repository.js';
import * as tournamentRepository from '../repository/tournament.repository.js';
import * as joinRequestRepository from '../repository/tournament-join-request.repository.js';
import * as teamRepository from '../repository/tournament-team.repository.js';
import * as rosterRepository from '../repository/tournament-roster.repository.js';
import * as favoriteRepository from '../repository/tournament-favorite.repository.js';
import * as eligibility from './tournament-eligibility.service.js';
import * as tournamentNotification from './tournament-notification.service.js';
import { parseJoinRoster, parseJoinTournamentBody } from '../dto/join-tournament.dto.js';
import { parseUpdateTournamentDto } from '../dto/update-tournament.dto.js';
import { parseCompleteTournamentDto } from '../dto/complete-tournament.dto.js';
import {
  toPublicJoinRequest,
  toPublicMyJoinRequest,
  toPublicTeam,
  toPublicTournament,
} from '../entity/tournament.entity.js';

function parseTournamentId(raw) {
  const tournamentId = Number(raw);
  if (!Number.isInteger(tournamentId) || tournamentId < 1 || tournamentId > PG_INT4_MAX) {
    throw new AppError('Invalid tournament id', 400);
  }
  return tournamentId;
}

function callerUserId(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > PG_INT4_MAX) {
    throw new AppError('Invalid user id', 400);
  }
  return value;
}

function parsePositiveInt(raw, message) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > PG_INT4_MAX) {
    throw new AppError(message, 400);
  }
  return value;
}

function isUniqueViolation(err) {
  return err?.code === '23505';
}

function assertOrganizer(tournament, callerId) {
  if (Number(tournament.organizer_user_id) !== callerId) {
    throw new AppError('Only the tournament organizer can perform this action', 403);
  }
}

async function assertPlayer(client, userId, action) {
  const user = await userRepository.findById(client, userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.role !== USER_ROLES.PLAYER) {
    throw new AppError(`Only PLAYER accounts can ${action}`, 403);
  }
  return user;
}

function computeCanJoin(tournament, viewerUserId) {
  if (Number(tournament.organizer_user_id) === viewerUserId) {
    return false;
  }
  if (tournament.status !== TOURNAMENT_STATUSES.OPEN_REGISTRATION) {
    return false;
  }
  if (new Date(tournament.registration_deadline).getTime() <= Date.now()) {
    return false;
  }
  if (Number(tournament.accepted_team_count) >= Number(tournament.max_teams)) {
    return false;
  }
  const hidden = [
    TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING,
    TOURNAMENT_JOIN_REQUEST_STATUSES.ACCEPTED,
    TOURNAMENT_JOIN_REQUEST_STATUSES.KICKED,
  ];
  if (hidden.includes(tournament.my_join_status)) {
    return false;
  }
  return true;
}

async function loadTournamentView(client, row, viewerUserId, { includeDescription = false } = {}) {
  const logosByTournament = await tournamentRepository.listTeamLogosByTournamentIds(
    client,
    [row.tournament_id],
  );
  const myJoinRequest = row.my_join_status
    ? { status: row.my_join_status }
    : null;
  return toPublicTournament(row, {
    teamLogos: logosByTournament.get(row.tournament_id) || [],
    myJoinRequest,
    canJoin: computeCanJoin(row, viewerUserId),
    includeDescription,
  });
}

const TOURNAMENT_INFO_NOTIFY_FIELDS = Object.freeze([
  'title',
  'description',
  'coverUrl',
  'registrationFeeVnd',
  'prizePoolVnd',
  'venueName',
  'venueAddress',
  'startsAt',
  'endsAt',
  'registrationDeadline',
]);

function buildTournamentUpdateFields(input) {
  const fields = {};
  if (input.title !== undefined) fields.title = input.title;
  if (input.coverUrl !== undefined) fields.coverUrl = input.coverUrl;
  if (input.description !== undefined) fields.description = input.description;
  if (input.venueName !== undefined) fields.venueName = input.venueName;
  if (input.venueAddress !== undefined) fields.venueAddress = input.venueAddress;
  if (input.province !== undefined) fields.province = input.province;
  if (input.city !== undefined) fields.city = input.city;
  if (input.latitude !== undefined) fields.latitude = input.latitude;
  if (input.longitude !== undefined) fields.longitude = input.longitude;
  if (input.startsAt !== undefined) fields.startsAt = input.startsAt;
  if (input.endsAt !== undefined) fields.endsAt = input.endsAt;
  if (input.registrationDeadline !== undefined) {
    fields.registrationDeadline = input.registrationDeadline;
  }
  if (input.registrationFeeVnd !== undefined) {
    fields.registrationFeeVnd = input.registrationFeeVnd;
  }
  if (input.prizePoolVnd !== undefined) fields.prizePoolVnd = input.prizePoolVnd;
  if (input.winners !== undefined) {
    fields.winnersJson = input.winners === null ? null : input.winners;
  }
  return fields;
}

function assertSchedulePatch(tournament, input) {
  const scheduleKeys = ['startsAt', 'endsAt', 'registrationDeadline'];
  if (!scheduleKeys.some((key) => input[key] !== undefined)) {
    return;
  }

  const startsAt = input.startsAt ?? tournament.starts_at;
  const endsAt = input.endsAt ?? tournament.ends_at;
  const registrationDeadline =
    input.registrationDeadline ?? tournament.registration_deadline;

  const startsMs = Date.parse(startsAt);
  const endsMs = Date.parse(endsAt);
  const regMs = Date.parse(registrationDeadline);

  if (Number.isFinite(startsMs) && Number.isFinite(endsMs) && endsMs < startsMs) {
    throw new AppError('endsAt must be on or after startsAt', 400);
  }
  if (
    Number.isFinite(startsMs) &&
    Number.isFinite(regMs) &&
    regMs > startsMs
  ) {
    throw new AppError(
      'registrationDeadline must be on or before startsAt',
      400,
    );
  }
  if (
    tournament.status === TOURNAMENT_STATUSES.OPEN_REGISTRATION &&
    input.startsAt &&
    Number.isFinite(startsMs) &&
    startsMs <= Date.now()
  ) {
    throw new AppError('startsAt must be in the future', 400);
  }
}

async function assertWinnersBelongToTournament(client, tournamentId, winners) {
  if (!winners?.length) {
    return;
  }
  const teams = await teamRepository.listByTournament(client, tournamentId);
  const teamIds = new Set(teams.map((team) => Number(team.team_id)));
  for (const entry of winners) {
    if (!teamIds.has(Number(entry.teamId))) {
      throw new AppError(
        `winners teamId ${entry.teamId} is not an accepted team in this tournament`,
        400,
      );
    }
  }
}

async function assertPlayerRanksBelongToTournament(client, tournamentId, playerRanks) {
  if (!playerRanks?.length) {
    return;
  }
  const rosterRows = await rosterRepository.listRosterPlayerIdsByTournament(
    client,
    tournamentId,
  );
  const rosterIds = new Set(
    rosterRows.map((row) => Number(row.roster_player_id)),
  );
  for (const entry of playerRanks) {
    if (!rosterIds.has(Number(entry.rosterPlayerId))) {
      throw new AppError(
        `playerRanks rosterPlayerId ${entry.rosterPlayerId} is not in this tournament`,
        400,
      );
    }
  }
}

function shouldNotifyParticipants(input) {
  return TOURNAMENT_INFO_NOTIFY_FIELDS.some((field) => input[field] !== undefined);
}

export async function createTournament(organizerUserId, input) {
  const client = await pool.connect();
  try {
    const user = await assertPlayer(client, organizerUserId, 'create a tournament');
    await eligibility.assertCanCreateTournament(client, user.user_id);

    const row = await tournamentRepository.createTournament(client, {
      organizerUserId: user.user_id,
      sport: input.sport,
      format: input.format,
      genderDivision: input.genderDivision ?? null,
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      venueName: input.venueName,
      venueAddress: input.venueAddress,
      province: input.province,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      registrationDeadline: input.registrationDeadline,
      maxTeams: input.maxTeams,
      registrationFeeVnd: input.registrationFeeVnd,
      prizePoolVnd: input.prizePoolVnd,
    });

    row.organizer_full_name = user.full_name;
    row.organizer_avatar_url = user.avatar_url ?? null;
    row.viewer_is_organizer = true;

    return {
      message: 'Tournament created',
      tournament: toPublicTournament(row, {
        teamLogos: [],
        canJoin: false,
        includeDescription: true,
      }),
    };
  } finally {
    client.release();
  }
}

export async function listTournaments(userId, query) {
  const client = await pool.connect();
  try {
    const viewerUserId = callerUserId(userId);
    const filters = {
      sport: query.sport,
      location: query.location,
      province: query.province,
      city: query.city,
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
      favorited: Boolean(query.favorited),
      limit: query.limit,
      offset: query.offset,
      viewerUserId,
    };

    const rows = await tournamentRepository.listTournaments(client, filters);
    const total = await tournamentRepository.countTournaments(client, filters);
    const suggestions = await tournamentRepository.listSearchSuggestions(
      client,
      filters,
    );
    const logosByTournament = await tournamentRepository.listTeamLogosByTournamentIds(
      client,
      rows.map((row) => row.tournament_id),
    );

    return {
      total,
      limit: query.limit,
      offset: query.offset,
      suggestions,
      tournaments: rows.map((row) =>
        toPublicTournament(row, {
          teamLogos: logosByTournament.get(row.tournament_id) || [],
          canJoin: false,
        }),
      ),
    };
  } finally {
    client.release();
  }
}

export async function getTournament(userId, rawId) {
  const tournamentId = parseTournamentId(rawId);
  const viewerUserId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const row = await tournamentRepository.findById(
      client,
      tournamentId,
      viewerUserId,
    );
    if (!row) {
      throw new AppError('Tournament not found', 404);
    }
    return {
      tournament: await loadTournamentView(client, row, viewerUserId, {
        includeDescription: true,
      }),
    };
  } finally {
    client.release();
  }
}

export async function joinTournament(userId, rawId, body) {
  const tournamentId = parseTournamentId(rawId);
  const captainId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      if (tournament.status !== TOURNAMENT_STATUSES.OPEN_REGISTRATION) {
        throw new AppError('Tournament is not open for registration', 400);
      }
      if (new Date(tournament.registration_deadline).getTime() <= Date.now()) {
        throw new AppError('Registration deadline has passed', 400);
      }
      if (
        Number(tournament.accepted_team_count) >= Number(tournament.max_teams)
      ) {
        throw new AppError('Tournament is full', 400);
      }
      if (Number(tournament.organizer_user_id) === captainId) {
        throw new AppError('Organizer cannot join their own tournament', 400);
      }

      const captain = await assertPlayer(client, captainId, 'join a tournament');
      const dto = parseJoinTournamentBody(body);
      let roster;
      try {
        roster = parseJoinRoster(tournament.sport, tournament.format, dto.roster);
      } catch (err) {
        throw new AppError(err.message, 400);
      }

      const existing = await joinRequestRepository.findLatestByTournamentCaptain(
        client,
        tournamentId,
        captainId,
        { forUpdate: true },
      );
      if (existing?.status === TOURNAMENT_JOIN_REQUEST_STATUSES.KICKED) {
        throw new AppError('You were removed from this tournament', 403);
      }
      if (existing?.status === TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('You already have a pending join request', 409);
      }
      if (existing?.status === TOURNAMENT_JOIN_REQUEST_STATUSES.ACCEPTED) {
        throw new AppError('You are already registered for this tournament', 409);
      }

      const payload = {
        tournamentId,
        captainUserId: captainId,
        teamName: dto.teamName,
        teamLogoUrl: dto.teamLogoUrl,
        roster,
        status: TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING,
      };

      let request;
      try {
        if (existing) {
          request = await joinRequestRepository.resetRequest(
            client,
            existing.request_id,
            payload,
          );
        } else {
          request = await joinRequestRepository.insert(client, payload);
        }
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new AppError('You already have a join request for this tournament', 409);
        }
        throw err;
      }

      request.captain_full_name = captain.full_name;
      request.captain_avatar_url = captain.avatar_url ?? null;
      request.captain_phone_number = captain.phone_number;

      await client.query('COMMIT');
      await tournamentNotification.notifyOrganizerJoinRequest(
        tournament,
        captain,
        request,
      );

      const refreshed = await tournamentRepository.findById(
        client,
        tournamentId,
        captainId,
      );
      return {
        message: 'Join request submitted',
        request: toPublicJoinRequest(request),
        tournament: await loadTournamentView(client, refreshed, captainId, {
          includeDescription: true,
        }),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function withdrawJoinRequest(userId, rawId) {
  const tournamentId = parseTournamentId(rawId);
  const captainId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      if (tournament.status !== TOURNAMENT_STATUSES.OPEN_REGISTRATION) {
        throw new AppError('Cannot withdraw after registration closes', 400);
      }
      if (new Date(tournament.registration_deadline).getTime() <= Date.now()) {
        throw new AppError('Registration deadline has passed', 400);
      }

      const request = await joinRequestRepository.findLatestByTournamentCaptain(
        client,
        tournamentId,
        captainId,
        { forUpdate: true },
      );
      if (!request || request.status !== TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('No pending join request to cancel', 400);
      }

      await joinRequestRepository.deleteById(client, request.request_id);
      await client.query('COMMIT');
      return { message: 'Join request cancelled' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function acceptJoinRequest(userId, rawTournamentId, rawRequestId) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const requestId = parsePositiveInt(rawRequestId, 'Invalid request id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      assertOrganizer(tournament, callerId);
      if (tournament.status !== TOURNAMENT_STATUSES.OPEN_REGISTRATION) {
        throw new AppError('Tournament is not accepting new teams', 400);
      }
      if (
        Number(tournament.accepted_team_count) >= Number(tournament.max_teams)
      ) {
        throw new AppError('Tournament is full', 400);
      }

      const request = await joinRequestRepository.findByIdForUpdate(
        client,
        requestId,
      );
      if (!request || Number(request.tournament_id) !== tournamentId) {
        throw new AppError('Join request not found', 404);
      }
      if (request.status !== TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('Join request is not pending', 400, {
          status: request.status,
        });
      }

      const team = await teamRepository.insertTeam(client, {
        tournamentId,
        captainUserId: request.captain_user_id,
        joinRequestId: request.request_id,
        teamName: request.team_name,
        teamLogoUrl: request.team_logo_url,
      });
      await rosterRepository.insertPlayers(
        client,
        team.team_id,
        Array.isArray(request.roster_json)
          ? request.roster_json
          : JSON.parse(request.roster_json),
      );

      const updatedRequest = await joinRequestRepository.updateStatus(
        client,
        requestId,
        TOURNAMENT_JOIN_REQUEST_STATUSES.ACCEPTED,
      );
      updatedRequest.captain_full_name = request.captain_full_name;
      updatedRequest.captain_avatar_url = request.captain_avatar_url;
      updatedRequest.captain_phone_number = request.captain_phone_number;

      const counts = await tournamentRepository.adjustAcceptedTeamCount(
        client,
        tournamentId,
        1,
      );
      if (
        Number(counts.accepted_team_count) >= Number(counts.max_teams)
      ) {
        await tournamentRepository.updateStatus(
          client,
          tournamentId,
          TOURNAMENT_STATUSES.FULL,
        );
      }

      await client.query('COMMIT');
      await tournamentNotification.notifyCaptainApproved(
        tournament,
        request.captain_user_id,
      );

      return {
        message: 'Join request accepted',
        request: toPublicJoinRequest(updatedRequest),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function rejectJoinRequest(userId, rawTournamentId, rawRequestId) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const requestId = parsePositiveInt(rawRequestId, 'Invalid request id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      assertOrganizer(tournament, callerId);

      const request = await joinRequestRepository.findByIdForUpdate(
        client,
        requestId,
      );
      if (!request || Number(request.tournament_id) !== tournamentId) {
        throw new AppError('Join request not found', 404);
      }
      if (request.status !== TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING) {
        throw new AppError('Join request is not pending', 400);
      }

      const updated = await joinRequestRepository.updateStatus(
        client,
        requestId,
        TOURNAMENT_JOIN_REQUEST_STATUSES.REJECTED,
      );
      updated.captain_full_name = request.captain_full_name;
      updated.captain_avatar_url = request.captain_avatar_url;

      await client.query('COMMIT');
      await tournamentNotification.notifyCaptainRejected(
        tournament,
        request.captain_user_id,
      );

      return {
        message: 'Join request rejected',
        request: toPublicJoinRequest(updated),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function cancelTournament(userId, rawId) {
  const tournamentId = parseTournamentId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      assertOrganizer(tournament, callerId);
      if (!canOrganizerCancel(tournament.status)) {
        throw new AppError('Tournament cannot be cancelled in its current state', 400);
      }
      if (new Date(tournament.starts_at).getTime() <= Date.now()) {
        throw new AppError('Cannot cancel after the tournament has started', 400);
      }

      await tournamentRepository.updateStatus(
        client,
        tournamentId,
        TOURNAMENT_STATUSES.CANCELLED,
      );
      const captainIds = await tournamentRepository.listAcceptedCaptainUserIds(
        client,
        tournamentId,
      );
      await client.query('COMMIT');

      await tournamentNotification.notifyTournamentCancelled(
        tournament,
        [tournament.organizer_user_id, ...captainIds],
        'ORGANIZER_CANCEL',
      );

      return { message: 'Tournament cancelled' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function kickTeam(userId, rawTournamentId, rawTeamId) {
  const tournamentId = parseTournamentId(rawTournamentId);
  const teamId = parsePositiveInt(rawTeamId, 'Invalid team id');
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      assertOrganizer(tournament, callerId);
      if (new Date(tournament.starts_at).getTime() <= Date.now()) {
        throw new AppError('Cannot kick teams after the tournament has started', 400);
      }

      const team = await teamRepository.findByIdForUpdate(client, teamId);
      if (!team || Number(team.tournament_id) !== tournamentId) {
        throw new AppError('Team not found', 404);
      }

      await rosterRepository.deleteByTeamId(client, teamId);
      await teamRepository.deleteById(client, teamId);

      const joinRequest = await joinRequestRepository.findLatestByTournamentCaptain(
        client,
        tournamentId,
        team.captain_user_id,
        { forUpdate: true },
      );
      if (joinRequest) {
        await joinRequestRepository.updateStatus(
          client,
          joinRequest.request_id,
          TOURNAMENT_JOIN_REQUEST_STATUSES.KICKED,
        );
      }
      await tournamentRepository.adjustAcceptedTeamCount(client, tournamentId, -1);
      if (tournament.status === TOURNAMENT_STATUSES.FULL) {
        await tournamentRepository.updateStatus(
          client,
          tournamentId,
          TOURNAMENT_STATUSES.OPEN_REGISTRATION,
        );
      }

      await client.query('COMMIT');
      await tournamentNotification.notifyCaptainKicked(
        tournament,
        team.captain_user_id,
      );

      return { message: 'Team removed from tournament' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function listJoinRequests(userId, rawId) {
  const tournamentId = parseTournamentId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const tournament = await tournamentRepository.findById(client, tournamentId);
    if (!tournament) {
      throw new AppError('Tournament not found', 404);
    }
    assertOrganizer(tournament, callerId);
    const rows = await joinRequestRepository.listPendingByTournament(
      client,
      tournamentId,
    );
    return {
      requests: rows.map((row) => toPublicJoinRequest(row)),
    };
  } finally {
    client.release();
  }
}

function sortRosterPlayers(players) {
  return [...players].sort((a, b) => {
    const rankA = a.rank == null ? Number.MAX_SAFE_INTEGER : Number(a.rank);
    const rankB = b.rank == null ? Number.MAX_SAFE_INTEGER : Number(b.rank);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  });
}

export async function listPlayers(userId, rawId) {
  const tournamentId = parseTournamentId(rawId);
  const client = await pool.connect();
  try {
    const tournament = await tournamentRepository.findById(
      client,
      tournamentId,
      callerUserId(userId),
    );
    if (!tournament) {
      throw new AppError('Tournament not found', 404);
    }

    const teams = await teamRepository.listByTournament(client, tournamentId);
    const rosterByTeam = await rosterRepository.listByTeamIds(
      client,
      teams.map((team) => team.team_id),
    );

    return {
      tournamentId,
      teams: teams.map((team) =>
        toPublicTeam(team, {
          roster: sortRosterPlayers(rosterByTeam.get(team.team_id) || []),
        }),
      ),
    };
  } finally {
    client.release();
  }
}

export async function listMine(userId, query) {
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    if (
      query.tab === TOURNAMENT_MINE_TABS.HOSTED &&
      query.section === TOURNAMENT_MINE_SECTIONS.TOURNAMENTS
    ) {
      const rows = await tournamentRepository.listHostedByOrganizer(client, {
        organizerUserId: callerId,
        limit: query.limit,
        offset: query.offset,
      });
      const total = await tournamentRepository.countHostedByOrganizer(
        client,
        callerId,
      );
      const logosByTournament = await tournamentRepository.listTeamLogosByTournamentIds(
        client,
        rows.map((row) => row.tournament_id),
      );
      return {
        total,
        limit: query.limit,
        offset: query.offset,
        tournaments: rows.map((row) =>
          toPublicTournament(row, {
            teamLogos: logosByTournament.get(row.tournament_id) || [],
            includeDescription: false,
          }),
        ),
      };
    }

    if (
      query.tab === TOURNAMENT_MINE_TABS.HOSTED &&
      query.section === TOURNAMENT_MINE_SECTIONS.PENDING_REQUESTS
    ) {
      const rows = await joinRequestRepository.listPendingForOrganizer(client, {
        organizerUserId: callerId,
        limit: query.limit,
        offset: query.offset,
      });
      const total = await joinRequestRepository.countPendingForOrganizer(
        client,
        callerId,
      );
      return {
        total,
        limit: query.limit,
        offset: query.offset,
        requests: rows.map((row) => toPublicJoinRequest(row)),
      };
    }

    if (
      query.tab === TOURNAMENT_MINE_TABS.JOINED &&
      query.section === TOURNAMENT_MINE_SECTIONS.TOURNAMENTS
    ) {
      const rows = await tournamentRepository.listJoinedByCaptain(client, {
        captainUserId: callerId,
        limit: query.limit,
        offset: query.offset,
      });
      const total = await tournamentRepository.countJoinedByCaptain(
        client,
        callerId,
      );
      const logosByTournament = await tournamentRepository.listTeamLogosByTournamentIds(
        client,
        rows.map((row) => row.tournament_id),
      );
      return {
        total,
        limit: query.limit,
        offset: query.offset,
        tournaments: rows.map((row) =>
          toPublicTournament(row, {
            teamLogos: logosByTournament.get(row.tournament_id) || [],
          }),
        ),
      };
    }

    const pendingCount = await joinRequestRepository.countMyPendingJoinRequests(
      client,
      callerId,
    );
    const rows = await joinRequestRepository.listMyJoinRequests(client, {
      userId: callerId,
      limit: query.limit,
      offset: query.offset,
      status: undefined,
    });
    const total = await joinRequestRepository.countMyJoinRequests(client, {
      userId: callerId,
      status: undefined,
    });
    return {
      total,
      pendingCount,
      limit: query.limit,
      offset: query.offset,
      requests: rows.map((row) => toPublicMyJoinRequest(row)),
    };
  } finally {
    client.release();
  }
}

export async function listMyJoinRequests(userId, query) {
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const pendingCount = await joinRequestRepository.countMyPendingJoinRequests(
      client,
      callerId,
    );
    const rows = await joinRequestRepository.listMyJoinRequests(client, {
      userId: callerId,
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    });
    const total = await joinRequestRepository.countMyJoinRequests(client, {
      userId: callerId,
      status: query.status,
    });
    return {
      total,
      pendingCount,
      limit: query.limit,
      offset: query.offset,
      requests: rows.map((row) => toPublicMyJoinRequest(row)),
    };
  } finally {
    client.release();
  }
}

export async function favoriteTournament(userId, rawId) {
  const tournamentId = parseTournamentId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    const tournament = await tournamentRepository.findById(client, tournamentId);
    if (!tournament) {
      throw new AppError('Tournament not found', 404);
    }
    await favoriteRepository.addFavorite(client, callerId, tournamentId);
    return { message: 'Tournament favorited', isFavorited: true };
  } finally {
    client.release();
  }
}

export async function unfavoriteTournament(userId, rawId) {
  const tournamentId = parseTournamentId(rawId);
  const callerId = callerUserId(userId);
  const client = await pool.connect();
  try {
    await favoriteRepository.removeFavorite(client, callerId, tournamentId);
    return { message: 'Tournament unfavorited', isFavorited: false };
  } finally {
    client.release();
  }
}

export async function completeTournament(userId, rawId, body) {
  const tournamentId = parseTournamentId(rawId);
  const callerId = callerUserId(userId);
  const input = parseCompleteTournamentDto(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      assertOrganizer(tournament, callerId);
      if (tournament.status !== TOURNAMENT_STATUSES.ACTIVE) {
        throw new AppError('Only active tournaments can be marked complete', 400);
      }

      if (input.winners?.length) {
        await assertWinnersBelongToTournament(
          client,
          tournamentId,
          input.winners,
        );
        await tournamentRepository.updateTournament(client, tournamentId, {
          winnersJson: input.winners,
        });
      }

      await tournamentRepository.updateStatus(
        client,
        tournamentId,
        TOURNAMENT_STATUSES.COMPLETED,
      );
      await client.query('COMMIT');

      const updated = await tournamentRepository.findById(
        client,
        tournamentId,
        callerId,
      );
      return {
        message: 'Tournament marked complete',
        tournament: await loadTournamentView(client, updated, callerId, {
          includeDescription: true,
        }),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function updateTournament(userId, rawId, body) {
  const tournamentId = parseTournamentId(rawId);
  const callerId = callerUserId(userId);
  const input = parseUpdateTournamentDto(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const tournament = await tournamentRepository.lockById(client, tournamentId);
      if (!tournament) {
        throw new AppError('Tournament not found', 404);
      }
      assertOrganizer(tournament, callerId);

      if (tournament.status === TOURNAMENT_STATUSES.CANCELLED) {
        throw new AppError('Cancelled tournaments cannot be updated', 400);
      }

      if (isTournamentPatchLockedStatus(tournament.status)) {
        const locked = findActiveLockedPatchFields(input);
        if (locked.length) {
          throw new AppError(
            `Cannot update ${locked.join(', ')} after tournament is active`,
            400,
          );
        }
      }

      assertSchedulePatch(tournament, input);
      await assertWinnersBelongToTournament(client, tournamentId, input.winners);
      await assertPlayerRanksBelongToTournament(
        client,
        tournamentId,
        input.playerRanks,
      );

      const updateFields = buildTournamentUpdateFields(input);
      if (Object.keys(updateFields).length) {
        await tournamentRepository.updateTournament(
          client,
          tournamentId,
          updateFields,
        );
      }

      if (input.playerRanks?.length) {
        const updatedCount = await rosterRepository.updateRanksForTournament(
          client,
          tournamentId,
          input.playerRanks,
        );
        if (updatedCount !== input.playerRanks.length) {
          throw new AppError(
            'One or more playerRanks rosterPlayerId values are invalid',
            400,
          );
        }
      }

      await client.query('COMMIT');

      const updated = await tournamentRepository.findById(
        client,
        tournamentId,
        callerId,
      );

      if (shouldNotifyParticipants(input)) {
        const captainIds = await tournamentRepository.listAcceptedCaptainUserIds(
          client,
          tournamentId,
        );
        await tournamentNotification.notifyTournamentUpdated(updated, captainIds);
      }

      return {
        message: 'Tournament updated',
        tournament: await loadTournamentView(client, updated, callerId, {
          includeDescription: true,
        }),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}
