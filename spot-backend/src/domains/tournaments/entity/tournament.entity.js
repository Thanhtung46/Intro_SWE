import {
  vnCityName,
  vnProvinceName,
} from '../../../shared/constants/vn-admin.js';
import {
  formatBadgeLabel,
  HOSTED_BY_LABEL,
  TOURNAMENT_MATCH_OUTCOMES,
} from '../../../shared/constants/tournaments.js';
import {
  badmintonMatchWinnerTeamSide,
  footballMatchOutcome,
  winnerTeamIdFromSide,
} from '../../../shared/constants/tournament-scoring.js';
import { SPORTS } from '../../../shared/constants/sports.js';

export function toPublicTournament(
  row,
  {
    teamLogos = [],
    myJoinRequest = null,
    canJoin = false,
    includeDescription = false,
  } = {},
) {
  if (!row) return null;

  const tournament = {
    tournamentId: row.tournament_id,
    sport: row.sport,
    format: row.format,
    genderDivision: row.gender_division ?? null,
    formatBadge: formatBadgeLabel(row.format, row.gender_division),
    title: row.title,
    coverUrl: row.cover_url,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    province: row.province ?? null,
    provinceName: vnProvinceName(row.province),
    city: row.city ?? null,
    cityName: vnCityName(row.province, row.city),
    latitude: Number(row.venue_lat),
    longitude: Number(row.venue_lng),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationDeadline: row.registration_deadline,
    maxTeams: Number(row.max_teams),
    acceptedTeamCount: Number(row.accepted_team_count ?? 0),
    registrationFeeVnd: Number(row.registration_fee_vnd),
    prizePoolVnd: Number(row.prize_pool_vnd),
    status: row.status,
    hostedByLabel: row.hosted_by_label ?? HOSTED_BY_LABEL,
    isFavorited: Boolean(row.is_favorited),
    isOrganizer:
      row.viewer_is_organizer != null
        ? Boolean(row.viewer_is_organizer)
        : undefined,
    myJoinRequest: myJoinRequest ?? undefined,
    canJoin,
    teamLogos: teamLogos.filter(Boolean).slice(0, 3),
    organizer: {
      userId: row.organizer_user_id,
      fullName: row.organizer_full_name ?? undefined,
      avatarUrl: row.organizer_avatar_url ?? null,
    },
    createdAt: row.created_at,
  };

  if (includeDescription) {
    tournament.description = row.description;
    tournament.winners = row.winners_json ?? null;
  }

  if (row.pending_request_count != null) {
    tournament.pendingRequestCount = Number(row.pending_request_count);
  }

  return tournament;
}

export function toPublicJoinRequest(row) {
  if (!row) return null;
  return {
    requestId: row.request_id,
    tournamentId: row.tournament_id,
    captainUserId: row.captain_user_id,
    teamName: row.team_name,
    teamLogoUrl: row.team_logo_url,
    roster: Array.isArray(row.roster_json) ? row.roster_json : [],
    status: row.status,
    captain: {
      userId: row.captain_user_id,
      fullName: row.captain_full_name ?? undefined,
      avatarUrl: row.captain_avatar_url ?? null,
      phoneNumber: row.captain_phone_number ?? undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicMyJoinRequest(row) {
  if (!row) return null;
  return {
    requestId: row.request_id,
    status: row.status,
    teamName: row.team_name,
    teamLogoUrl: row.team_logo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tournament: {
      tournamentId: row.tournament_id,
      title: row.tournament_title,
      sport: row.tournament_sport,
      format: row.tournament_format,
      genderDivision: row.tournament_gender_division ?? null,
      formatBadge: formatBadgeLabel(
        row.tournament_format,
        row.tournament_gender_division,
      ),
      status: row.tournament_status,
      venueName: row.tournament_venue_name,
      venueAddress: row.tournament_venue_address,
      coverUrl: row.tournament_cover_url ?? null,
      organizerFullName: row.organizer_full_name ?? undefined,
      organizerAvatarUrl: row.organizer_avatar_url ?? null,
    },
  };
}

export function toPublicTeam(row, { roster = [] } = {}) {
  if (!row) return null;
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    teamLogoUrl: row.team_logo_url,
    captainUserId: row.captain_user_id,
    captainFullName: row.captain_full_name ?? undefined,
    captainAvatarUrl: row.captain_avatar_url ?? null,
    roster: roster.map((player) => ({
      rosterPlayerId: player.roster_player_id,
      name: player.name,
      jerseyNumber:
        player.jersey_number == null ? null : Number(player.jersey_number),
      rank: player.rank == null ? null : Number(player.rank),
    })),
    createdAt: row.created_at,
  };
}

function parseSetsJson(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function resolveMatchResult(row, sport) {
  if (sport === SPORTS.FOOTBALL) {
    if (row.team_a_goals == null || row.team_b_goals == null) {
      return {
        resultStatus: TOURNAMENT_MATCH_OUTCOMES.SCHEDULED,
        result: null,
      };
    }
    const teamAGoals = Number(row.team_a_goals);
    const teamBGoals = Number(row.team_b_goals);
    const outcome = footballMatchOutcome(teamAGoals, teamBGoals);
    return {
      resultStatus: TOURNAMENT_MATCH_OUTCOMES.COMPLETED,
      result: {
        type: 'FOOTBALL',
        teamAGoals,
        teamBGoals,
        outcome: outcome.outcome,
        winnerTeamId: winnerTeamIdFromSide(
          outcome.winnerSide,
          row.team_a_id,
          row.team_b_id,
        ),
      },
    };
  }

  const sets = parseSetsJson(row.sets_json).map((set) => ({
    teamAPoints: Number(set.teamAPoints),
    teamBPoints: Number(set.teamBPoints),
  }));
  if (!sets.length) {
    return {
      resultStatus: TOURNAMENT_MATCH_OUTCOMES.SCHEDULED,
      result: null,
    };
  }

  const winnerSide = badmintonMatchWinnerTeamSide(sets);
  const teamASets = sets.filter((set) => set.teamAPoints > set.teamBPoints).length;
  const teamBSets = sets.length - teamASets;
  const isComplete = winnerSide != null && Math.max(teamASets, teamBSets) >= 2;

  return {
    resultStatus: isComplete
      ? TOURNAMENT_MATCH_OUTCOMES.COMPLETED
      : TOURNAMENT_MATCH_OUTCOMES.SCHEDULED,
    result: {
      type: 'BADMINTON',
      sets,
      winnerTeamId: winnerTeamIdFromSide(winnerSide, row.team_a_id, row.team_b_id),
    },
  };
}

export function toPublicMatch(row, sport) {
  if (!row) return null;
  const { resultStatus, result } = resolveMatchResult(row, sport);
  return {
    matchId: row.match_id,
    tournamentId: row.tournament_id,
    round: row.round,
    scheduledAt: row.scheduled_at,
    resultStatus,
    result,
    teamA: {
      teamId: row.team_a_id,
      teamName: row.team_a_name,
      teamLogoUrl: row.team_a_logo_url,
    },
    teamB: {
      teamId: row.team_b_id,
      teamName: row.team_b_name,
      teamLogoUrl: row.team_b_logo_url,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
