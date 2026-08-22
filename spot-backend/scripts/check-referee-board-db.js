import '../src/shared/config/env.js';
import pool from '../src/shared/database/pool.js';
import * as venueRepository from '../src/domains/venue/repository/venue.repository.js';

const checks = [
  ['referee_venue_favorites', 'SELECT 1 FROM schema_referee.referee_venue_favorites LIMIT 1'],
  ['venues.province/city', 'SELECT province, city FROM schema_venue.venues LIMIT 1'],
  ['fold_search_text', "SELECT schema_matchmaking.fold_search_text('Skyline')"],
  ['similarity', "SELECT similarity('abc','abc')"],
];

const client = await pool.connect();
try {
  for (const [name, sql] of checks) {
    try {
      await client.query(sql);
      console.log(`OK  ${name}`);
    } catch (err) {
      console.log(`FAIL ${name}: ${err.message}`);
    }
  }

  try {
    const rows = await venueRepository.listBoardVenuesForReferee(client, 'Football', {
      q: 'Smoke',
      refereeId: 1,
      limit: 5,
      offset: 0,
      excludeVenueIds: [],
    });
    console.log(`OK  listBoardVenuesForReferee q=Smoke (${rows.length} rows)`);
  } catch (err) {
    console.log(`FAIL listBoardVenuesForReferee: ${err.message}`);
    console.log(err.stack);
  }
} finally {
  client.release();
  await pool.end();
}
