const mongoose = require('mongoose');
const Country = require('./models/Country');
const ClubTeam = require('./models/ClubTeam');
const Position = require('./models/Position');
const NationalTeam = require('./models/NationalTeams');
const Player = require('./models/Player');
const Match = require('./models/Match');
const Fixture = require('./models/Fixtures');
require('dotenv').config();

// Hardcoded MongoDB URIs
const SOURCE_MONGO_URI = "mongodb+srv://source:";
const DESTINATION_MONGO_URI = "mongodb+srv://destination:";

// Helper function to create a new mongoose connection
const createConnection = (uri) => {
  return mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

// Helper function to get models from a connection
const getModels = (connection) => {
  return {
    Country: connection.model('Country', Country.schema),
    ClubTeam: connection.model('ClubTeam', ClubTeam.schema),
    Position: connection.model('Position', Position.schema),
    NationalTeam: connection.model('NationalTeam', NationalTeam.schema),
    Player: connection.model('Player', Player.schema),
    Match: connection.model('Match', Match.schema),
    Fixture: connection.model('Fixture', Fixture.schema),
  };
};

// Helper function to normalize player rating data
const normalizePlayerRatingHistory = (player) => {
  // If player already has proper ratingHistory, return as-is
  if (player.ratingHistory && player.ratingHistory.length > 0) {
    return player.ratingHistory;
  }

  // If player has old 'ratings' array, transform it
  if (player.ratings && player.ratings.length > 0) {
    console.log(
      `   🔄 Converting old 'ratings' array for player: ${player.name}`
    );
    return player.ratings.map((rating) => ({
      date: rating.date,
      newRating: rating.rating, // Note: old structure used 'rating' instead of 'newRating'
      netRating: rating.netRating || 0,
      type: rating.type || 'match',
      matchId: rating.matchId || null,
    }));
  }

  // If player has legacy single 'rating' field, create history entry
  if (player.rating !== undefined && player.rating !== null) {
    console.log(
      `   🔄 Converting legacy 'rating' field for player: ${player.name}`
    );
    return [
      {
        date: player.dateOfBirth || new Date(),
        newRating: player.rating,
        netRating: 0,
        type: 'manual',
        matchId: null,
      },
    ];
  }

  // No rating data found
  return [];
};

// Enhanced logging helper for ID mappings
const logIdMapping = (type, oldId, newId, name = '') => {
  console.log(
    `   📌 ${type} ID Mapping: ${oldId} → ${newId}${name ? ` (${name})` : ''}`
  );
};

// Helper function to validate source database relationships
const validateSourceRelationships = async (sourceData) => {
  console.log('   🔍 Checking relationship integrity...');
  const errors = [];
  let brokenReferences = 0;
  const detailedReport = {
    players: { total: 0, withBrokenRefs: 0 },
    matches: { total: 0, withBrokenRefs: 0 },
    fixtures: { total: 0, withBrokenRefs: 0 },
  };

  // Create lookup sets for faster validation
  const countryIds = new Set(sourceData.countries.map((c) => c._id.toString()));
  const positionIds = new Set(
    sourceData.positions.map((p) => p._id.toString())
  );
  const clubTeamIds = new Set(
    sourceData.clubTeams.map((c) => c._id.toString())
  );
  const nationalTeamIds = new Set(
    sourceData.nationalTeams.map((n) => n._id.toString())
  );
  const playerIds = new Set(sourceData.players.map((p) => p._id.toString()));
  const matchIds = new Set(sourceData.matches.map((m) => m._id.toString()));

  // Validate Player relationships
  sourceData.players.forEach((player) => {
    detailedReport.players.total++;
    let playerHasBrokenRefs = false;

    // Check country reference
    if (player.country && !countryIds.has(player.country.toString())) {
      errors.push(
        `Player "${player.name}" has invalid country reference: ${player.country}`
      );
      brokenReferences++;
      playerHasBrokenRefs = true;
    }

    // Check position reference
    if (player.position && !positionIds.has(player.position.toString())) {
      errors.push(
        `Player "${player.name}" has invalid position reference: ${player.position}`
      );
      brokenReferences++;
      playerHasBrokenRefs = true;
    }

    // Check current club reference
    if (
      player.currentClub?.club &&
      !clubTeamIds.has(player.currentClub.club.toString())
    ) {
      errors.push(
        `Player "${player.name}" has invalid current club reference: ${player.currentClub.club}`
      );
      brokenReferences++;
      playerHasBrokenRefs = true;
    }

    // Check previous clubs references
    if (player.previousClubs) {
      player.previousClubs.forEach((club, index) => {
        if (club.name && !clubTeamIds.has(club.name.toString())) {
          errors.push(
            `Player "${player.name}" has invalid previous club reference at index ${index}: ${club.name}`
          );
          brokenReferences++;
          playerHasBrokenRefs = true;
        }
      });
    }

    // Check rating history match references
    const ratingHistory = normalizePlayerRatingHistory(player);
    ratingHistory.forEach((entry, index) => {
      if (entry.matchId && !matchIds.has(entry.matchId.toString())) {
        errors.push(
          `Player "${player.name}" has invalid match reference in rating history at index ${index}: ${entry.matchId}`
        );
        brokenReferences++;
        playerHasBrokenRefs = true;
      }
    });

    if (playerHasBrokenRefs) {
      detailedReport.players.withBrokenRefs++;
    }
  });

  // Validate Match relationships
  sourceData.matches.forEach((match) => {
    detailedReport.matches.total++;
    let matchHasBrokenRefs = false;

    // Check team references
    if (match.type === 'ClubTeam') {
      if (
        match.homeTeam?.team &&
        !clubTeamIds.has(match.homeTeam.team.toString())
      ) {
        errors.push(
          `Match at venue "${match.venue}" has invalid home club team reference: ${match.homeTeam.team}`
        );
        brokenReferences++;
        matchHasBrokenRefs = true;
      }
      if (
        match.awayTeam?.team &&
        !clubTeamIds.has(match.awayTeam.team.toString())
      ) {
        errors.push(
          `Match at venue "${match.venue}" has invalid away club team reference: ${match.awayTeam.team}`
        );
        brokenReferences++;
        matchHasBrokenRefs = true;
      }
    } else if (match.type === 'NationalTeam') {
      if (
        match.homeTeam?.team &&
        !nationalTeamIds.has(match.homeTeam.team.toString())
      ) {
        errors.push(
          `Match at venue "${match.venue}" has invalid home national team reference: ${match.homeTeam.team}`
        );
        brokenReferences++;
        matchHasBrokenRefs = true;
      }
      if (
        match.awayTeam?.team &&
        !nationalTeamIds.has(match.awayTeam.team.toString())
      ) {
        errors.push(
          `Match at venue "${match.venue}" has invalid away national team reference: ${match.awayTeam.team}`
        );
        brokenReferences++;
        matchHasBrokenRefs = true;
      }
    }

    // Check player references
    if (match.homeTeam?.players) {
      match.homeTeam.players.forEach((playerObj, index) => {
        if (playerObj.player && !playerIds.has(playerObj.player.toString())) {
          errors.push(
            `Match at venue "${match.venue}" has invalid home team player reference at index ${index}: ${playerObj.player}`
          );
          brokenReferences++;
          matchHasBrokenRefs = true;
        }
      });
    }
    if (match.awayTeam?.players) {
      match.awayTeam.players.forEach((playerObj, index) => {
        if (playerObj.player && !playerIds.has(playerObj.player.toString())) {
          errors.push(
            `Match at venue "${match.venue}" has invalid away team player reference at index ${index}: ${playerObj.player}`
          );
          brokenReferences++;
          matchHasBrokenRefs = true;
        }
      });
    }

    if (matchHasBrokenRefs) {
      detailedReport.matches.withBrokenRefs++;
    }
  });

  // Validate Fixture relationships
  sourceData.fixtures.forEach((fixture) => {
    detailedReport.fixtures.total++;
    let fixtureHasBrokenRefs = false;

    if (fixture.type === 'ClubTeam') {
      if (
        fixture.homeTeam?.team &&
        !clubTeamIds.has(fixture.homeTeam.team.toString())
      ) {
        errors.push(
          `Fixture at venue "${fixture.venue}" has invalid home club team reference: ${fixture.homeTeam.team}`
        );
        brokenReferences++;
        fixtureHasBrokenRefs = true;
      }
      if (
        fixture.awayTeam?.team &&
        !clubTeamIds.has(fixture.awayTeam.team.toString())
      ) {
        errors.push(
          `Fixture at venue "${fixture.venue}" has invalid away club team reference: ${fixture.awayTeam.team}`
        );
        brokenReferences++;
        fixtureHasBrokenRefs = true;
      }
    } else if (fixture.type === 'NationalTeam') {
      if (
        fixture.homeTeam?.team &&
        !nationalTeamIds.has(fixture.homeTeam.team.toString())
      ) {
        errors.push(
          `Fixture at venue "${fixture.venue}" has invalid home national team reference: ${fixture.homeTeam.team}`
        );
        brokenReferences++;
        fixtureHasBrokenRefs = true;
      }
      if (
        fixture.awayTeam?.team &&
        !nationalTeamIds.has(fixture.awayTeam.team.toString())
      ) {
        errors.push(
          `Fixture at venue "${fixture.venue}" has invalid away national team reference: ${fixture.awayTeam.team}`
        );
        brokenReferences++;
        fixtureHasBrokenRefs = true;
      }
    }

    if (fixtureHasBrokenRefs) {
      detailedReport.fixtures.withBrokenRefs++;
    }
  });

  console.log(
    `   📊 Validation summary: ${brokenReferences} broken references found`
  );
  console.log(`   📊 Detailed breakdown:`);
  console.log(
    `      - Players: ${detailedReport.players.withBrokenRefs}/${detailedReport.players.total} have broken references`
  );
  console.log(
    `      - Matches: ${detailedReport.matches.withBrokenRefs}/${detailedReport.matches.total} have broken references`
  );
  console.log(
    `      - Fixtures: ${detailedReport.fixtures.withBrokenRefs}/${detailedReport.fixtures.total} have broken references`
  );

  return {
    hasErrors: brokenReferences > 0,
    errors: errors.slice(0, 10), // Limit to first 10 errors for readability
    totalBrokenReferences: brokenReferences,
    detailedReport,
  };
};

// Helper function to create indexes
const createIndexes = async (destModels) => {
  console.log('📊 Creating indexes...');

  try {
    // Country indexes
    await destModels.Country.createIndex({ country: 1 });

    // ClubTeam indexes
    await destModels.ClubTeam.createIndex({ name: 1 });

    // NationalTeam indexes
    await destModels.NationalTeam.createIndex({ country: 1, type: 1 });

    // Player indexes
    await destModels.Player.createIndex(
      { name: 1, dateOfBirth: 1 },
      { unique: true }
    );
    await destModels.Player.createIndex({ 'currentClub.club': 1 });
    await destModels.Player.createIndex({
      'nationalTeams.name': 1,
      'nationalTeams.type': 1,
    });

    // Match indexes
    await destModels.Match.createIndex(
      {
        date: 1,
        venue: 1,
        'homeTeam.team': 1,
        'awayTeam.team': 1,
        type: 1,
      },
      {
        unique: true,
        collation: { locale: 'en', strength: 2 },
      }
    );

    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.warn('⚠️  Some indexes failed to create:', error.message);
  }
};

// Enhanced verification function
const runComprehensiveVerification = async (
  sourceData,
  destModels,
  idMappings
) => {
  console.log('\n🔍 Running comprehensive verification...');

  const verificationReport = {
    idMappings: {
      countries: { verified: 0, failed: 0 },
      positions: { verified: 0, failed: 0 },
      clubTeams: { verified: 0, failed: 0 },
      nationalTeams: { verified: 0, failed: 0 },
      players: { verified: 0, failed: 0 },
      matches: { verified: 0, failed: 0 },
    },
    relationships: {
      playerCountry: { verified: 0, failed: 0, cleaned: 0 },
      playerPosition: { verified: 0, failed: 0, cleaned: 0 },
      playerCurrentClub: { verified: 0, failed: 0, cleaned: 0 },
      playerPreviousClubs: { verified: 0, failed: 0, cleaned: 0 },
      playerRatingHistory: { verified: 0, failed: 0, cleaned: 0 },
      matchTeams: { verified: 0, failed: 0 },
      matchPlayers: { verified: 0, failed: 0 },
    },
  };

  // Verify ID mappings
  console.log('\n   📋 Verifying ID mappings...');
  for (const [type, mapping] of Object.entries(idMappings)) {
    console.log(`      Checking ${type}...`);
    for (const [oldId, newId] of mapping) {
      try {
        let model;
        switch (type) {
          case 'countries':
            model = destModels.Country;
            break;
          case 'positions':
            model = destModels.Position;
            break;
          case 'clubTeams':
            model = destModels.ClubTeam;
            break;
          case 'nationalTeams':
            model = destModels.NationalTeam;
            break;
          case 'players':
            model = destModels.Player;
            break;
          case 'matches':
            model = destModels.Match;
            break;
        }

        const exists = await model.findById(newId);
        if (exists) {
          verificationReport.idMappings[type].verified++;
        } else {
          verificationReport.idMappings[type].failed++;
          console.log(
            `         ❌ Failed to verify ${type} mapping: ${oldId} → ${newId}`
          );
        }
      } catch (error) {
        verificationReport.idMappings[type].failed++;
      }
    }
  }

  // Verify player relationships with names
  console.log('\n   📋 Verifying player relationships with names...');
  const players = await destModels.Player.find({})
    .limit(20)
    .populate('country')
    .populate('position')
    .populate('currentClub.club');

  console.log('\n   Sample Player Relationships:');
  for (let i = 0; i < Math.min(5, players.length); i++) {
    const player = players[i];
    const originalPlayer = sourceData.players.find(
      (p) => p.name === player.name
    );

    console.log(`\n   👤 ${player.name}:`);

    // Country
    if (player.country) {
      console.log(`      🌍 Country: ${player.country.country} ✅`);
      verificationReport.relationships.playerCountry.verified++;
    } else if (originalPlayer?.country) {
      console.log(`      🌍 Country: NULL (was cleaned) 🧹`);
      verificationReport.relationships.playerCountry.cleaned++;
    }

    // Position
    if (player.position) {
      console.log(`      ⚽ Position: ${player.position.position} ✅`);
      verificationReport.relationships.playerPosition.verified++;
    } else if (originalPlayer?.position) {
      console.log(`      ⚽ Position: NULL (was cleaned) 🧹`);
      verificationReport.relationships.playerPosition.cleaned++;
    }

    // Current Club
    if (player.currentClub?.club) {
      console.log(`      🏟️  Club: ${player.currentClub.club.name} ✅`);
      verificationReport.relationships.playerCurrentClub.verified++;
    } else if (originalPlayer?.currentClub?.club) {
      console.log(`      🏟️  Club: NULL (was cleaned) 🧹`);
      verificationReport.relationships.playerCurrentClub.cleaned++;
    }

    // Rating History
    if (player.ratingHistory?.length > 0) {
      const totalRating = player.ratingHistory.reduce(
        (sum, r) => sum + r.newRating,
        0
      );
      console.log(
        `      📊 Rating: ${player.ratingHistory.length} entries, Total: ${totalRating}`
      );
      verificationReport.relationships.playerRatingHistory.verified++;
    }
  }

  // Continue counting remaining players
  for (let i = 5; i < players.length; i++) {
    const player = players[i];
    const originalPlayer = sourceData.players.find(
      (p) => p.name === player.name
    );

    if (player.country)
      verificationReport.relationships.playerCountry.verified++;
    else if (originalPlayer?.country)
      verificationReport.relationships.playerCountry.cleaned++;

    if (player.position)
      verificationReport.relationships.playerPosition.verified++;
    else if (originalPlayer?.position)
      verificationReport.relationships.playerPosition.cleaned++;

    if (player.currentClub?.club)
      verificationReport.relationships.playerCurrentClub.verified++;
    else if (originalPlayer?.currentClub?.club)
      verificationReport.relationships.playerCurrentClub.cleaned++;
  }

  // Print verification report
  console.log('\n📊 Verification Report:');
  console.log('\n   ID Mappings:');
  for (const [type, stats] of Object.entries(verificationReport.idMappings)) {
    console.log(
      `      ${type}: ✅ ${stats.verified} verified, ❌ ${stats.failed} failed`
    );
  }

  console.log('\n   Relationships:');
  for (const [rel, stats] of Object.entries(verificationReport.relationships)) {
    console.log(
      `      ${rel}: ✅ ${stats.verified} verified, ❌ ${stats.failed} failed, 🧹 ${stats.cleaned} cleaned`
    );
  }

  return verificationReport;
};

const migrateDatabase = async () => {
  let sourceConnection = null;
  let destinationConnection = null;

  try {
    console.log('🔄 Starting database migration...');
    console.log(`📅 Migration started at: ${new Date().toISOString()}`);

    // Connect to source database
    console.log('📡 Connecting to source database...');
    sourceConnection = createConnection(SOURCE_MONGO_URI);
    await new Promise((resolve, reject) => {
      sourceConnection.on('connected', resolve);
      sourceConnection.on('error', reject);
    });
    console.log('✅ Connected to source database');

    // Connect to destination database
    console.log('📡 Connecting to destination database...');
    destinationConnection = createConnection(DESTINATION_MONGO_URI);
    await new Promise((resolve, reject) => {
      destinationConnection.on('connected', resolve);
      destinationConnection.on('error', reject);
    });
    console.log('✅ Connected to destination database');

    // Get models for both connections
    const sourceModels = getModels(sourceConnection);
    const destModels = getModels(destinationConnection);

    // Step 1: Fetch all data from source database
    console.log('\n📥 Fetching data from source database...');

    const sourceData = {
      countries: await sourceModels.Country.find({}).lean(),
      positions: await sourceModels.Position.find({}).lean(),
      clubTeams: await sourceModels.ClubTeam.find({}).lean(),
      nationalTeams: await sourceModels.NationalTeam.find({}).lean(),
      players: await sourceModels.Player.find({}).lean(),
      matches: await sourceModels.Match.find({}).lean(),
      fixtures: await sourceModels.Fixture.find({}).lean(),
    };

    // Step 1.5: Validate all relationships in source database
    console.log('\n🔍 Validating source database relationships...');
    const validationResults = await validateSourceRelationships(sourceData);

    if (validationResults.hasErrors) {
      console.log('⚠️  Found relationship issues in source database:');
      validationResults.errors.forEach((error) => console.log(`   ${error}`));
      console.log(
        'Migration will continue but broken references will be cleaned up.'
      );
    } else {
      console.log('✅ All source database relationships are valid');
    }

    console.log('📊 Source data summary:');
    console.log(`   Countries: ${sourceData.countries.length}`);
    console.log(`   Positions: ${sourceData.positions.length}`);
    console.log(`   Club Teams: ${sourceData.clubTeams.length}`);
    console.log(`   National Teams: ${sourceData.nationalTeams.length}`);
    console.log(`   Players: ${sourceData.players.length}`);
    console.log(`   Matches: ${sourceData.matches.length}`);
    console.log(`   Fixtures: ${sourceData.fixtures.length}`);

    // Step 2: Analyze player data structures
    console.log('\n🔍 Analyzing player data structures...');
    let playersWithNewRatingHistory = 0;
    let playersWithOldRatings = 0;
    let playersWithLegacyRating = 0;
    let playersWithNoRating = 0;

    sourceData.players.forEach((player) => {
      if (player.ratingHistory && player.ratingHistory.length > 0) {
        playersWithNewRatingHistory++;
      } else if (player.ratings && player.ratings.length > 0) {
        playersWithOldRatings++;
      } else if (player.rating !== undefined && player.rating !== null) {
        playersWithLegacyRating++;
      } else {
        playersWithNoRating++;
      }
    });

    console.log('📈 Player rating data analysis:');
    console.log(
      `   New ratingHistory structure: ${playersWithNewRatingHistory}`
    );
    console.log(`   Old ratings array: ${playersWithOldRatings}`);
    console.log(`   Legacy rating field: ${playersWithLegacyRating}`);
    console.log(`   No rating data: ${playersWithNoRating}`);

    // Step 3: Clear destination database
    console.log('\n🗑️  Clearing destination database...');
    await Promise.all([
      destModels.Match.deleteMany({}),
      destModels.Fixture.deleteMany({}),
      destModels.Player.deleteMany({}),
      destModels.NationalTeam.deleteMany({}),
      destModels.ClubTeam.deleteMany({}),
      destModels.Position.deleteMany({}),
      destModels.Country.deleteMany({}),
    ]);
    console.log('✅ Destination database cleared');

    // Step 4: Create ID mapping for referenced documents
    const idMappings = {
      countries: new Map(),
      positions: new Map(),
      clubTeams: new Map(),
      nationalTeams: new Map(),
      players: new Map(),
      matches: new Map(),
    };

    // Step 5: Insert data in order (maintaining referential integrity)

    // Insert Countries first (no dependencies)
    console.log('\n📝 Inserting countries...');
    if (sourceData.countries.length > 0) {
      const countriesData = sourceData.countries.map((doc) => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedCountries = await destModels.Country.insertMany(
        countriesData
      );
      sourceData.countries.forEach((original, index) => {
        idMappings.countries.set(
          original._id.toString(),
          insertedCountries[index]._id
        );
        if (index < 5) {
          // Log first 5 mappings
          logIdMapping(
            'Country',
            original._id.toString(),
            insertedCountries[index]._id.toString(),
            original.country
          );
        }
      });
      console.log(`✅ Inserted ${insertedCountries.length} countries`);
    }

    // Insert Positions (no dependencies)
    console.log('📝 Inserting positions...');
    if (sourceData.positions.length > 0) {
      const positionsData = sourceData.positions.map((doc) => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedPositions = await destModels.Position.insertMany(
        positionsData
      );
      sourceData.positions.forEach((original, index) => {
        idMappings.positions.set(
          original._id.toString(),
          insertedPositions[index]._id
        );
        if (index < 5) {
          // Log first 5 mappings
          logIdMapping(
            'Position',
            original._id.toString(),
            insertedPositions[index]._id.toString(),
            original.position
          );
        }
      });
      console.log(`✅ Inserted ${insertedPositions.length} positions`);
    }

    // Insert Club Teams (no dependencies)
    console.log('📝 Inserting club teams...');
    if (sourceData.clubTeams.length > 0) {
      const clubTeamsData = sourceData.clubTeams.map((doc) => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedClubTeams = await destModels.ClubTeam.insertMany(
        clubTeamsData
      );
      sourceData.clubTeams.forEach((original, index) => {
        idMappings.clubTeams.set(
          original._id.toString(),
          insertedClubTeams[index]._id
        );
        if (index < 5) {
          // Log first 5 mappings
          logIdMapping(
            'ClubTeam',
            original._id.toString(),
            insertedClubTeams[index]._id.toString(),
            original.name
          );
        }
      });
      console.log(`✅ Inserted ${insertedClubTeams.length} club teams`);
    }

    // Insert National Teams (depends on countries indirectly)
    console.log('📝 Inserting national teams...');
    if (sourceData.nationalTeams.length > 0) {
      const nationalTeamsData = sourceData.nationalTeams.map((doc) => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedNationalTeams = await destModels.NationalTeam.insertMany(
        nationalTeamsData
      );
      sourceData.nationalTeams.forEach((original, index) => {
        idMappings.nationalTeams.set(
          original._id.toString(),
          insertedNationalTeams[index]._id
        );
        if (index < 5) {
          // Log first 5 mappings
          logIdMapping(
            'NationalTeam',
            original._id.toString(),
            insertedNationalTeams[index]._id.toString(),
            `${original.country} ${original.type}`
          );
        }
      });
      console.log(`✅ Inserted ${insertedNationalTeams.length} national teams`);
    }

    // Insert Players with normalized rating history (depends on countries, positions, clubTeams)
    console.log('📝 Inserting and normalizing players...');
    if (sourceData.players.length > 0) {
      let normalizedPlayersCount = 0;
      let cleanedReferencesCount = 0;
      const relationshipChanges = {
        country: [],
        position: [],
        currentClub: [],
        previousClubs: [],
      };

      const playersData = sourceData.players.map((doc) => {
        const { _id, ratings, rating, ...player } = doc; // Remove old structures

        // Normalize rating history
        const normalizedRatingHistory = normalizePlayerRatingHistory(doc);
        if (normalizedRatingHistory.length > 0 && !doc.ratingHistory) {
          normalizedPlayersCount++;
        }

        player.ratingHistory = normalizedRatingHistory;

        // Update country reference (clean up broken references)
        if (player.country) {
          const oldCountryId = player.country.toString();
          if (idMappings.countries.has(oldCountryId)) {
            const sourceCountry = sourceData.countries.find(
              (c) => c._id.toString() === oldCountryId
            );
            player.country = idMappings.countries.get(oldCountryId);
            if (relationshipChanges.country.length < 5) {
              // Log first 5
              console.log(
                `   ✅ Player "${player.name}" → Country "${sourceCountry?.country}"`
              );
            }
          } else {
            const sourceCountry = sourceData.countries.find(
              (c) => c._id.toString() === oldCountryId
            );
            console.log(
              `   🧹 Cleaning broken country reference for player: ${
                player.name
              } (was: ${sourceCountry?.country || 'Unknown'})`
            );
            relationshipChanges.country.push({
              player: player.name,
              oldId: oldCountryId,
              newId: null,
            });
            player.country = null;
            cleanedReferencesCount++;
          }
        }

        // Update position reference (clean up broken references)
        if (player.position) {
          const oldPositionId = player.position.toString();
          if (idMappings.positions.has(oldPositionId)) {
            const sourcePosition = sourceData.positions.find(
              (p) => p._id.toString() === oldPositionId
            );
            player.position = idMappings.positions.get(oldPositionId);
            if (relationshipChanges.position.length < 5) {
              // Log first 5
              console.log(
                `   ✅ Player "${player.name}" → Position "${sourcePosition?.position}"`
              );
            }
          } else {
            const sourcePosition = sourceData.positions.find(
              (p) => p._id.toString() === oldPositionId
            );
            console.log(
              `   🧹 Cleaning broken position reference for player: ${
                player.name
              } (was: ${sourcePosition?.position || 'Unknown'})`
            );
            relationshipChanges.position.push({
              player: player.name,
              oldId: oldPositionId,
              newId: null,
            });
            player.position = null;
            cleanedReferencesCount++;
          }
        }

        // Update current club reference (clean up broken references)
        if (player.currentClub && player.currentClub.club) {
          const oldClubId = player.currentClub.club.toString();
          if (idMappings.clubTeams.has(oldClubId)) {
            const sourceClub = sourceData.clubTeams.find(
              (c) => c._id.toString() === oldClubId
            );
            player.currentClub.club = idMappings.clubTeams.get(oldClubId);
            if (relationshipChanges.currentClub.length < 5) {
              // Log first 5
              console.log(
                `   ✅ Player "${player.name}" → Club "${sourceClub?.name}"`
              );
            }
          } else {
            const sourceClub = sourceData.clubTeams.find(
              (c) => c._id.toString() === oldClubId
            );
            console.log(
              `   🧹 Cleaning broken current club reference for player: ${
                player.name
              } (was: ${sourceClub?.name || 'Unknown'})`
            );
            relationshipChanges.currentClub.push({
              player: player.name,
              oldId: oldClubId,
              newId: null,
            });
            player.currentClub = null;
            cleanedReferencesCount++;
          }
        }

        // Update previous clubs references (clean up broken references)
        if (player.previousClubs && player.previousClubs.length > 0) {
          player.previousClubs = player.previousClubs.filter((club) => {
            if (club.name && idMappings.clubTeams.has(club.name.toString())) {
              const sourceClub = sourceData.clubTeams.find(
                (c) => c._id.toString() === club.name.toString()
              );
              club.name = idMappings.clubTeams.get(club.name.toString());
              if (relationshipChanges.previousClubs.length < 3) {
                // Log first 3
                console.log(
                  `   ✅ Player "${player.name}" → Previous Club "${sourceClub?.name}"`
                );
              }
              return true;
            } else {
              const sourceClub = sourceData.clubTeams.find(
                (c) => c._id.toString() === club.name?.toString()
              );
              console.log(
                `   🧹 Removing broken previous club reference for player: ${
                  player.name
                } (was: ${sourceClub?.name || 'Unknown'})`
              );
              relationshipChanges.previousClubs.push({
                player: player.name,
                oldId: club.name?.toString(),
                newId: null,
              });
              cleanedReferencesCount++;
              return false; // Remove broken reference
            }
          });
        }

        return player;
      });

      const insertedPlayers = await destModels.Player.insertMany(playersData);
      sourceData.players.forEach((original, index) => {
        idMappings.players.set(
          original._id.toString(),
          insertedPlayers[index]._id
        );
      });

      console.log(`✅ Inserted ${insertedPlayers.length} players`);
      console.log(
        `   🔄 Normalized rating data for ${normalizedPlayersCount} players`
      );
      console.log(`   🧹 Cleaned ${cleanedReferencesCount} broken references`);

      // Log relationship changes summary
      if (relationshipChanges.country.length > 0) {
        console.log(
          `   📋 Country reference changes: ${relationshipChanges.country.length}`
        );
      }
      if (relationshipChanges.position.length > 0) {
        console.log(
          `   📋 Position reference changes: ${relationshipChanges.position.length}`
        );
      }
      if (relationshipChanges.currentClub.length > 0) {
        console.log(
          `   📋 Current club reference changes: ${relationshipChanges.currentClub.length}`
        );
      }
      if (relationshipChanges.previousClubs.length > 0) {
        console.log(
          `   📋 Previous clubs reference changes: ${relationshipChanges.previousClubs.length}`
        );
      }
    }

    // Insert Matches (depends on clubTeams, nationalTeams, players)
    console.log('📝 Inserting matches...');
    if (sourceData.matches.length > 0) {
      let updatedTeamReferences = 0;
      let updatedPlayerReferences = 0;
      let matchesLogged = 0;

      const matchesData = sourceData.matches.map((doc) => {
        const { _id, ...match } = doc;
        let homeTeamName = '';
        let awayTeamName = '';

        // Update home team reference
        if (match.homeTeam && match.homeTeam.team) {
          const teamId = match.homeTeam.team.toString();
          if (match.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            const sourceTeam = sourceData.clubTeams.find(
              (c) => c._id.toString() === teamId
            );
            homeTeamName = sourceTeam?.name || 'Unknown';
            match.homeTeam.team = idMappings.clubTeams.get(teamId);
            updatedTeamReferences++;
          } else if (
            match.type === 'NationalTeam' &&
            idMappings.nationalTeams.has(teamId)
          ) {
            const sourceTeam = sourceData.nationalTeams.find(
              (n) => n._id.toString() === teamId
            );
            homeTeamName =
              `${sourceTeam?.country} ${sourceTeam?.type}` || 'Unknown';
            match.homeTeam.team = idMappings.nationalTeams.get(teamId);
            updatedTeamReferences++;
          }
        }

        // Update away team reference
        if (match.awayTeam && match.awayTeam.team) {
          const teamId = match.awayTeam.team.toString();
          if (match.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            const sourceTeam = sourceData.clubTeams.find(
              (c) => c._id.toString() === teamId
            );
            awayTeamName = sourceTeam?.name || 'Unknown';
            match.awayTeam.team = idMappings.clubTeams.get(teamId);
            updatedTeamReferences++;
          } else if (
            match.type === 'NationalTeam' &&
            idMappings.nationalTeams.has(teamId)
          ) {
            const sourceTeam = sourceData.nationalTeams.find(
              (n) => n._id.toString() === teamId
            );
            awayTeamName =
              `${sourceTeam?.country} ${sourceTeam?.type}` || 'Unknown';
            match.awayTeam.team = idMappings.nationalTeams.get(teamId);
            updatedTeamReferences++;
          }
        }

        // Log first 5 matches
        if (matchesLogged < 5 && homeTeamName && awayTeamName) {
          console.log(
            `   ✅ Match: ${homeTeamName} vs ${awayTeamName} at ${
              match.venue
            } (${new Date(match.date).toLocaleDateString()})`
          );
          matchesLogged++;
        }

        // Update player references in both teams
        if (match.homeTeam && match.homeTeam.players) {
          match.homeTeam.players = match.homeTeam.players.map((playerObj) => {
            if (
              playerObj.player &&
              idMappings.players.has(playerObj.player.toString())
            ) {
              playerObj.player = idMappings.players.get(
                playerObj.player.toString()
              );
              updatedPlayerReferences++;
            }
            return playerObj;
          });
        }

        if (match.awayTeam && match.awayTeam.players) {
          match.awayTeam.players = match.awayTeam.players.map((playerObj) => {
            if (
              playerObj.player &&
              idMappings.players.has(playerObj.player.toString())
            ) {
              playerObj.player = idMappings.players.get(
                playerObj.player.toString()
              );
              updatedPlayerReferences++;
            }
            return playerObj;
          });
        }

        return match;
      });

      const insertedMatches = await destModels.Match.insertMany(matchesData);

      // Store match ID mapping
      sourceData.matches.forEach((original, index) => {
        idMappings.matches.set(
          original._id.toString(),
          insertedMatches[index]._id
        );
      });

      console.log(`✅ Inserted ${insertedMatches.length} matches`);
      console.log(`   📋 Updated ${updatedTeamReferences} team references`);
      console.log(`   📋 Updated ${updatedPlayerReferences} player references`);
    }

    // Step 6: Update ratingHistory matchId references in Players
    console.log('📝 Updating player ratingHistory matchId references...');
    let updatedPlayersCount = 0;
    let cleanedMatchReferencesCount = 0;
    let validMatchReferencesCount = 0;

    for (const [oldPlayerId, newPlayerId] of idMappings.players) {
      // Find the original player data
      const originalPlayer = sourceData.players.find(
        (p) => p._id.toString() === oldPlayerId
      );

      if (originalPlayer) {
        // Get normalized rating history
        const ratingHistory = normalizePlayerRatingHistory(originalPlayer);

        if (ratingHistory.length > 0) {
          // Check if any ratingHistory entries have matchId that needs updating
          let hasValidMatchReferences = false;
          const updatedRatingHistory = ratingHistory.map((entry) => {
            if (entry.matchId) {
              if (idMappings.matches.has(entry.matchId.toString())) {
                hasValidMatchReferences = true;
                validMatchReferencesCount++;
                return {
                  ...entry,
                  matchId: idMappings.matches.get(entry.matchId.toString()),
                };
              } else {
                // Clean up broken match reference
                console.log(
                  `   🧹 Cleaning broken match reference in rating history for player: ${originalPlayer.name}`
                );
                cleanedMatchReferencesCount++;
                return {
                  ...entry,
                  matchId: null, // Keep the rating entry but remove broken match reference
                };
              }
            }
            return entry;
          });

          if (hasValidMatchReferences || cleanedMatchReferencesCount > 0) {
            await destModels.Player.findByIdAndUpdate(newPlayerId, {
              ratingHistory: updatedRatingHistory,
            });
            updatedPlayersCount++;
          }
        }
      }
    }

    console.log(
      `✅ Updated ratingHistory matchId references for ${updatedPlayersCount} players`
    );
    console.log(
      `   📋 Valid match references updated: ${validMatchReferencesCount}`
    );
    console.log(
      `   🧹 Cleaned ${cleanedMatchReferencesCount} broken match references`
    );

    // Step 6.5: Log relationship verifications
    console.log('\n📊 Verifying relationships with names...');

    // Sample 10 players to verify relationships
    const sampleSize = Math.min(10, sourceData.players.length);
    console.log(`   Checking ${sampleSize} sample player relationships:`);

    for (let i = 0; i < sampleSize; i++) {
      const sourcePlayer = sourceData.players[i];
      const destPlayerId = idMappings.players.get(sourcePlayer._id.toString());

      if (destPlayerId) {
        const destPlayer = await destModels.Player.findById(destPlayerId)
          .populate('country')
          .populate('position')
          .populate('currentClub.club');

        console.log(`\n   👤 Player: ${destPlayer.name}`);

        // Verify Country
        if (sourcePlayer.country) {
          const sourceCountry = sourceData.countries.find(
            (c) => c._id.toString() === sourcePlayer.country.toString()
          );
          if (destPlayer.country) {
            console.log(
              `      🌍 Country: ${sourceCountry?.country} → ${destPlayer.country.country} ✅`
            );
          } else {
            console.log(
              `      🌍 Country: ${sourceCountry?.country} → NULL (cleaned) 🧹`
            );
          }
        }

        // Verify Position
        if (sourcePlayer.position) {
          const sourcePosition = sourceData.positions.find(
            (p) => p._id.toString() === sourcePlayer.position.toString()
          );
          if (destPlayer.position) {
            console.log(
              `      ⚽ Position: ${sourcePosition?.position} → ${destPlayer.position.position} ✅`
            );
          } else {
            console.log(
              `      ⚽ Position: ${sourcePosition?.position} → NULL (cleaned) 🧹`
            );
          }
        }

        // Verify Current Club
        if (sourcePlayer.currentClub?.club) {
          const sourceClub = sourceData.clubTeams.find(
            (c) => c._id.toString() === sourcePlayer.currentClub.club.toString()
          );
          if (destPlayer.currentClub?.club) {
            console.log(
              `      🏟️  Club: ${sourceClub?.name} → ${destPlayer.currentClub.club.name} ✅`
            );
          } else {
            console.log(
              `      🏟️  Club: ${sourceClub?.name} → NULL (cleaned) 🧹`
            );
          }
        }

        // Verify National Teams
        if (
          sourcePlayer.nationalTeams &&
          sourcePlayer.nationalTeams.length > 0
        ) {
          console.log(
            `      🏆 National Teams: ${sourcePlayer.nationalTeams
              .map((nt) => `${nt.name} ${nt.type}`)
              .join(', ')}`
          );
        }
      }
    }

    // Sample 5 matches to verify team relationships
    console.log('\n\n   Checking 5 sample match relationships:');
    const matchSampleSize = Math.min(5, sourceData.matches.length);

    for (let i = 0; i < matchSampleSize; i++) {
      const sourceMatch = sourceData.matches[i];
      const destMatchId = idMappings.matches.get(sourceMatch._id.toString());

      if (destMatchId) {
        const destMatch = await destModels.Match.findById(destMatchId)
          .populate('homeTeam.team')
          .populate('awayTeam.team');

        console.log(
          `\n   ⚽ Match: ${new Date(destMatch.date).toLocaleDateString()} at ${
            destMatch.venue
          }`
        );

        if (sourceMatch.type === 'ClubTeam') {
          const sourceHomeTeam = sourceData.clubTeams.find(
            (c) => c._id.toString() === sourceMatch.homeTeam.team.toString()
          );
          const sourceAwayTeam = sourceData.clubTeams.find(
            (c) => c._id.toString() === sourceMatch.awayTeam.team.toString()
          );

          console.log(
            `      🏠 Home: ${sourceHomeTeam?.name} → ${destMatch.homeTeam.team?.name} ✅`
          );
          console.log(
            `      ✈️  Away: ${sourceAwayTeam?.name} → ${destMatch.awayTeam.team?.name} ✅`
          );
        } else {
          const sourceHomeTeam = sourceData.nationalTeams.find(
            (n) => n._id.toString() === sourceMatch.homeTeam.team.toString()
          );
          const sourceAwayTeam = sourceData.nationalTeams.find(
            (n) => n._id.toString() === sourceMatch.awayTeam.team.toString()
          );

          console.log(
            `      🏠 Home: ${sourceHomeTeam?.country} ${sourceHomeTeam?.type} → ${destMatch.homeTeam.team?.country} ${destMatch.homeTeam.team?.type} ✅`
          );
          console.log(
            `      ✈️  Away: ${sourceAwayTeam?.country} ${sourceAwayTeam?.type} → ${destMatch.awayTeam.team?.country} ${destMatch.awayTeam.team?.type} ✅`
          );
        }

        console.log(
          `      📊 Score: ${destMatch.homeTeam.score} - ${destMatch.awayTeam.score}`
        );
      }
    }

    // Insert Fixtures (depends on clubTeams, nationalTeams)
    console.log('📝 Inserting fixtures...');
    if (sourceData.fixtures.length > 0) {
      let updatedFixtureTeamReferences = 0;

      const fixturesData = sourceData.fixtures.map((doc) => {
        const { _id, ...fixture } = doc;

        // Update home team reference
        if (fixture.homeTeam && fixture.homeTeam.team) {
          const teamId = fixture.homeTeam.team.toString();
          if (fixture.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            fixture.homeTeam.team = idMappings.clubTeams.get(teamId);
            updatedFixtureTeamReferences++;
          } else if (
            fixture.type === 'NationalTeam' &&
            idMappings.nationalTeams.has(teamId)
          ) {
            fixture.homeTeam.team = idMappings.nationalTeams.get(teamId);
            updatedFixtureTeamReferences++;
          }
        }

        // Update away team reference
        if (fixture.awayTeam && fixture.awayTeam.team) {
          const teamId = fixture.awayTeam.team.toString();
          if (fixture.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            fixture.awayTeam.team = idMappings.clubTeams.get(teamId);
            updatedFixtureTeamReferences++;
          } else if (
            fixture.type === 'NationalTeam' &&
            idMappings.nationalTeams.has(teamId)
          ) {
            fixture.awayTeam.team = idMappings.nationalTeams.get(teamId);
            updatedFixtureTeamReferences++;
          }
        }

        return fixture;
      });

      const insertedFixtures = await destModels.Fixture.insertMany(
        fixturesData
      );
      console.log(`✅ Inserted ${insertedFixtures.length} fixtures`);
      console.log(
        `   📋 Updated ${updatedFixtureTeamReferences} team references`
      );
    }

    // Step 7: Create Indexes
    await createIndexes(destModels);

    // Step 8: Basic Verification
    console.log('\n🔍 Verifying migration...');
    const destData = {
      countries: await destModels.Country.countDocuments(),
      positions: await destModels.Position.countDocuments(),
      clubTeams: await destModels.ClubTeam.countDocuments(),
      nationalTeams: await destModels.NationalTeam.countDocuments(),
      players: await destModels.Player.countDocuments(),
      matches: await destModels.Match.countDocuments(),
      fixtures: await destModels.Fixture.countDocuments(),
    };

    console.log('📊 Destination data summary:');
    console.log(
      `   Countries: ${destData.countries} (source: ${sourceData.countries.length})`
    );
    console.log(
      `   Positions: ${destData.positions} (source: ${sourceData.positions.length})`
    );
    console.log(
      `   Club Teams: ${destData.clubTeams} (source: ${sourceData.clubTeams.length})`
    );
    console.log(
      `   National Teams: ${destData.nationalTeams} (source: ${sourceData.nationalTeams.length})`
    );
    console.log(
      `   Players: ${destData.players} (source: ${sourceData.players.length})`
    );
    console.log(
      `   Matches: ${destData.matches} (source: ${sourceData.matches.length})`
    );
    console.log(
      `   Fixtures: ${destData.fixtures} (source: ${sourceData.fixtures.length})`
    );

    // Check if counts match
    const migrationSuccess =
      sourceData.countries.length === destData.countries &&
      sourceData.positions.length === destData.positions &&
      sourceData.clubTeams.length === destData.clubTeams &&
      sourceData.nationalTeams.length === destData.nationalTeams &&
      sourceData.players.length === destData.players &&
      sourceData.matches.length === destData.matches &&
      sourceData.fixtures.length === destData.fixtures;

    if (migrationSuccess) {
      console.log(
        '\n🎉 Migration completed successfully! All data counts match.'
      );
    } else {
      console.log(
        "\n⚠️  Migration completed but some data counts don't match. Please review."
      );
    }

    // Enhanced verification queries
    console.log('\n🔍 Running enhanced verification queries...');

    // Check if a player with references exists
    const samplePlayer = await destModels.Player.findOne()
      .populate('position')
      .populate('country')
      .populate('currentClub.club');

    if (samplePlayer) {
      console.log('\n📋 Sample player verification:');
      console.log(`   Name: ${samplePlayer.name}`);
      console.log(`   Position: ${samplePlayer.position?.position || 'N/A'}`);
      console.log(`   Country: ${samplePlayer.country?.country || 'N/A'}`);
      console.log(
        `   Current Club: ${samplePlayer.currentClub?.club?.name || 'N/A'}`
      );
      console.log(
        `   Rating History Entries: ${samplePlayer.ratingHistory?.length || 0}`
      );

      // Test rating calculation like controllers do
      if (samplePlayer.ratingHistory && samplePlayer.ratingHistory.length > 0) {
        const totalRating = samplePlayer.ratingHistory.reduce(
          (sum, entry) => sum + (entry.newRating || 0),
          0
        );
        console.log(`   Total Rating (sum): ${totalRating}`);
      }
    }

    // Check if a match with references exists
    const sampleMatch = await destModels.Match.findOne();
    if (sampleMatch) {
      console.log('\n⚽ Sample match verification:');
      console.log(`   Match ID: ${sampleMatch._id}`);
      console.log(`   Type: ${sampleMatch.type}`);
      console.log(`   Date: ${sampleMatch.date}`);
      console.log(`   Venue: ${sampleMatch.venue}`);
      console.log(
        `   Score: ${sampleMatch.homeTeam.score} - ${sampleMatch.awayTeam.score}`
      );
    }

    // Verify ratingHistory matchId references
    const playerWithRatingHistory = await destModels.Player.findOne({
      'ratingHistory.matchId': { $exists: true },
    });

    if (playerWithRatingHistory) {
      console.log('\n📈 RatingHistory verification:');
      console.log(`   Player: ${playerWithRatingHistory.name}`);
      const entriesWithMatchId = playerWithRatingHistory.ratingHistory.filter(
        (entry) => entry.matchId
      );
      console.log(
        `   Rating entries with matchId: ${entriesWithMatchId.length}`
      );

      if (entriesWithMatchId.length > 0) {
        // Verify that the matchId actually exists in the matches collection
        const firstMatchId = entriesWithMatchId[0].matchId;
        const matchExists = await destModels.Match.findById(firstMatchId);
        console.log(
          `   First matchId reference valid: ${matchExists ? 'Yes' : 'No'}`
        );
      }
    }

    // Test aggregation like controllers do
    console.log('\n🧮 Testing controller-style aggregations...');
    const testClub = await destModels.ClubTeam.aggregate([
      { $limit: 1 },
      {
        $lookup: {
          from: 'players',
          let: { clubId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$currentClub.club', '$$clubId'],
                },
              },
            },
            {
              $project: {
                totalRating: {
                  $sum: '$ratingHistory.newRating',
                },
              },
            },
          ],
          as: 'players',
        },
      },
      {
        $addFields: {
          rating: { $sum: '$players.totalRating' },
        },
      },
    ]);

    if (testClub.length > 0) {
      console.log(
        `   Sample club aggregation successful: ${testClub[0].name} (Rating: ${
          testClub[0].rating || 0
        })`
      );
    }

    // Run comprehensive verification
    await runComprehensiveVerification(sourceData, destModels, idMappings);

    // Final relationship verification with names
    console.log('\n\n🔍 Final Relationship Verification (with names):');

    // Test 5 random players with full relationship paths
    console.log('\n📋 Random Player Relationship Checks:');
    const randomPlayers = await destModels.Player.aggregate([
      { $sample: { size: 5 } },
      {
        $lookup: {
          from: 'countries',
          localField: 'country',
          foreignField: '_id',
          as: 'countryDetails',
        },
      },
      {
        $lookup: {
          from: 'positions',
          localField: 'position',
          foreignField: '_id',
          as: 'positionDetails',
        },
      },
      {
        $lookup: {
          from: 'clubteams',
          localField: 'currentClub.club',
          foreignField: '_id',
          as: 'clubDetails',
        },
      },
    ]);

    randomPlayers.forEach((player) => {
      console.log(`\n   👤 ${player.name}:`);
      console.log(
        `      🌍 Country: ${player.countryDetails[0]?.country || 'None'}`
      );
      console.log(
        `      ⚽ Position: ${player.positionDetails[0]?.position || 'None'}`
      );
      console.log(
        `      🏟️  Current Club: ${player.clubDetails[0]?.name || 'None'}`
      );
      console.log(
        `      📊 Rating History: ${player.ratingHistory?.length || 0} entries`
      );
    });

    // Test 3 random matches with full details
    console.log('\n\n⚽ Random Match Relationship Checks:');
    const randomMatches = await destModels.Match.aggregate([
      { $sample: { size: 3 } },
      {
        $lookup: {
          from: 'clubteams',
          localField: 'homeTeam.team',
          foreignField: '_id',
          as: 'homeClubTeam',
        },
      },
      {
        $lookup: {
          from: 'nationalteams',
          localField: 'homeTeam.team',
          foreignField: '_id',
          as: 'homeNationalTeam',
        },
      },
      {
        $lookup: {
          from: 'clubteams',
          localField: 'awayTeam.team',
          foreignField: '_id',
          as: 'awayClubTeam',
        },
      },
      {
        $lookup: {
          from: 'nationalteams',
          localField: 'awayTeam.team',
          foreignField: '_id',
          as: 'awayNationalTeam',
        },
      },
    ]);

    randomMatches.forEach((match) => {
      console.log(
        `\n   📅 Match on ${new Date(match.date).toLocaleDateString()} at ${
          match.venue
        }:`
      );
      if (match.type === 'ClubTeam') {
        console.log(
          `      🏠 Home: ${match.homeClubTeam[0]?.name || 'Unknown'} (Score: ${
            match.homeTeam.score
          })`
        );
        console.log(
          `      ✈️  Away: ${
            match.awayClubTeam[0]?.name || 'Unknown'
          } (Score: ${match.awayTeam.score})`
        );
      } else {
        console.log(
          `      🏠 Home: ${match.homeNationalTeam[0]?.country} ${match.homeNationalTeam[0]?.type} (Score: ${match.homeTeam.score})`
        );
        console.log(
          `      ✈️  Away: ${match.awayNationalTeam[0]?.country} ${match.awayNationalTeam[0]?.type} (Score: ${match.awayTeam.score})`
        );
      }
      console.log(
        `      👥 Players: ${match.homeTeam.players?.length || 0} home, ${
          match.awayTeam.players?.length || 0
        } away`
      );
    });

    console.log(`\n📅 Migration completed at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.close();
      console.log('🔌 Source database connection closed');
    }
    if (destinationConnection) {
      await destinationConnection.close();
      console.log('🔌 Destination database connection closed');
    }
  }
};

// Run the migration
console.log('🚀 Starting database migration process...');
migrateDatabase()
  .then(() => {
    console.log('✅ Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
