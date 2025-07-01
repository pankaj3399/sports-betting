const mongoose = require('mongoose');
const Country = require('./models/Country');
const ClubTeam = require('./models/ClubTeam');
const Position = require('./models/Position');
const NationalTeam = require('./models/NationalTeams');
const Player = require('./models/Player');
const Match = require('./models/Match');
const Fixture = require('./models/Fixtures');
require('dotenv').config();

// MongoDB URIs
const SOURCE_MONGO_URI =
  'mongodb+srv://anafariya:anafariya@cluster0.e3covlw.mongodb.net/sports_betting?retryWrites=true&w=majority&appName=Cluster0';
const DESTINATION_MONGO_URI =
  'mongodb+srv://anafariya:anafariya@cluster0.e3covlw.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

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
  if (player.ratingHistory && player.ratingHistory.length > 0) {
    return player.ratingHistory;
  }

  if (player.ratings && player.ratings.length > 0) {
    console.log(
      `   🔄 Converting old 'ratings' array for player: ${player.name}`
    );
    return player.ratings.map((rating) => ({
      date: rating.date,
      newRating: rating.rating,
      netRating: rating.netRating || 0,
      type: rating.type || 'match',
      matchId: rating.matchId || null,
    }));
  }

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

  return [];
};

// Helper function to create indexes
const createIndexes = async (destModels) => {
  console.log('📊 Creating indexes...');

  try {
    await destModels.Country.createIndex({ country: 1 });
    await destModels.ClubTeam.createIndex({ name: 1 });
    await destModels.NationalTeam.createIndex({ country: 1, type: 1 });
    await destModels.Player.createIndex(
      { name: 1, dateOfBirth: 1 },
      { unique: true }
    );
    await destModels.Player.createIndex({ 'currentClub.club': 1 });
    await destModels.Player.createIndex({
      'nationalTeams.name': 1,
      'nationalTeams.type': 1,
    });
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

const migrateDatabase = async () => {
  let sourceConnection = null;
  let destinationConnection = null;

  try {
    console.log('🔄 Starting FAST database migration with exact ObjectIds...');
    console.log(`📅 Migration started at: ${new Date().toISOString()}`);

    // Connect to databases
    console.log('📡 Connecting to source database...');
    sourceConnection = createConnection(SOURCE_MONGO_URI);
    await new Promise((resolve, reject) => {
      sourceConnection.on('connected', resolve);
      sourceConnection.on('error', reject);
    });
    console.log('✅ Connected to source database');

    console.log('📡 Connecting to destination database...');
    destinationConnection = createConnection(DESTINATION_MONGO_URI);
    await new Promise((resolve, reject) => {
      destinationConnection.on('connected', resolve);
      destinationConnection.on('error', reject);
    });
    console.log('✅ Connected to destination database');

    const sourceModels = getModels(sourceConnection);
    const destModels = getModels(destinationConnection);

    // Step 1: COMPLETELY CLEAR destination database
    console.log('\n🗑️  CLEARING ENTIRE DESTINATION DATABASE...');
    const deleteResults = await Promise.all([
      destModels.Match.deleteMany({}),
      destModels.Fixture.deleteMany({}),
      destModels.Player.deleteMany({}),
      destModels.NationalTeam.deleteMany({}),
      destModels.ClubTeam.deleteMany({}),
      destModels.Position.deleteMany({}),
      destModels.Country.deleteMany({}),
    ]);

    console.log('✅ Destination database completely cleared:');
    console.log(`   Deleted ${deleteResults[0].deletedCount} matches`);
    console.log(`   Deleted ${deleteResults[1].deletedCount} fixtures`);
    console.log(`   Deleted ${deleteResults[2].deletedCount} players`);
    console.log(`   Deleted ${deleteResults[3].deletedCount} national teams`);
    console.log(`   Deleted ${deleteResults[4].deletedCount} club teams`);
    console.log(`   Deleted ${deleteResults[5].deletedCount} positions`);
    console.log(`   Deleted ${deleteResults[6].deletedCount} countries`);

    // Step 2: Fetch all data from source
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

    console.log('📊 Source data summary:');
    console.log(`   Countries: ${sourceData.countries.length}`);
    console.log(`   Positions: ${sourceData.positions.length}`);
    console.log(`   Club Teams: ${sourceData.clubTeams.length}`);
    console.log(`   National Teams: ${sourceData.nationalTeams.length}`);
    console.log(`   Players: ${sourceData.players.length}`);
    console.log(`   Matches: ${sourceData.matches.length}`);
    console.log(`   Fixtures: ${sourceData.fixtures.length}`);

    // Step 3: Insert with exact ObjectIds (much simpler!)

    // Countries
    console.log('\n📝 Inserting countries with original IDs...');
    if (sourceData.countries.length > 0) {
      await destModels.Country.insertMany(sourceData.countries, {
        ordered: false,
      });
      console.log(`✅ Inserted ${sourceData.countries.length} countries`);
    }

    // Positions
    console.log('📝 Inserting positions with original IDs...');
    if (sourceData.positions.length > 0) {
      await destModels.Position.insertMany(sourceData.positions, {
        ordered: false,
      });
      console.log(`✅ Inserted ${sourceData.positions.length} positions`);
    }

    // Club Teams
    console.log('📝 Inserting club teams with original IDs...');
    if (sourceData.clubTeams.length > 0) {
      await destModels.ClubTeam.insertMany(sourceData.clubTeams, {
        ordered: false,
      });
      console.log(`✅ Inserted ${sourceData.clubTeams.length} club teams`);
    }

    // National Teams
    console.log('📝 Inserting national teams with original IDs...');
    if (sourceData.nationalTeams.length > 0) {
      await destModels.NationalTeam.insertMany(sourceData.nationalTeams, {
        ordered: false,
      });
      console.log(
        `✅ Inserted ${sourceData.nationalTeams.length} national teams`
      );
    }

    // Players (only normalize rating history)
    console.log('📝 Inserting players with original IDs...');
    if (sourceData.players.length > 0) {
      let normalizedCount = 0;
      const playersData = sourceData.players.map((player) => {
        const { ratings, rating, ...playerData } = player;
        const normalizedHistory = normalizePlayerRatingHistory(player);
        if (normalizedHistory.length > 0 && !player.ratingHistory) {
          normalizedCount++;
        }
        return {
          ...playerData,
          ratingHistory: normalizedHistory,
        };
      });

      await destModels.Player.insertMany(playersData, { ordered: false });
      console.log(`✅ Inserted ${sourceData.players.length} players`);
      console.log(
        `   🔄 Normalized rating data for ${normalizedCount} players`
      );
    }

    // Matches (no transformation needed!)
    console.log('📝 Inserting matches with original IDs...');
    if (sourceData.matches.length > 0) {
      await destModels.Match.insertMany(sourceData.matches, { ordered: false });
      console.log(`✅ Inserted ${sourceData.matches.length} matches`);
    }

    // Fixtures
    console.log('📝 Inserting fixtures with original IDs...');
    if (sourceData.fixtures.length > 0) {
      await destModels.Fixture.insertMany(sourceData.fixtures, {
        ordered: false,
      });
      console.log(`✅ Inserted ${sourceData.fixtures.length} fixtures`);
    }

    // Step 4: Create indexes
    await createIndexes(destModels);

    // Step 5: Verification
    console.log('\n🔍 Verifying migration...');

    const destCounts = {
      countries: await destModels.Country.countDocuments(),
      positions: await destModels.Position.countDocuments(),
      clubTeams: await destModels.ClubTeam.countDocuments(),
      nationalTeams: await destModels.NationalTeam.countDocuments(),
      players: await destModels.Player.countDocuments(),
      matches: await destModels.Match.countDocuments(),
      fixtures: await destModels.Fixture.countDocuments(),
    };

    console.log('📊 Verification - Document counts:');
    console.log(
      `   Countries: ${destCounts.countries} (expected: ${
        sourceData.countries.length
      }) ${destCounts.countries === sourceData.countries.length ? '✅' : '❌'}`
    );
    console.log(
      `   Positions: ${destCounts.positions} (expected: ${
        sourceData.positions.length
      }) ${destCounts.positions === sourceData.positions.length ? '✅' : '❌'}`
    );
    console.log(
      `   Club Teams: ${destCounts.clubTeams} (expected: ${
        sourceData.clubTeams.length
      }) ${destCounts.clubTeams === sourceData.clubTeams.length ? '✅' : '❌'}`
    );
    console.log(
      `   National Teams: ${destCounts.nationalTeams} (expected: ${
        sourceData.nationalTeams.length
      }) ${
        destCounts.nationalTeams === sourceData.nationalTeams.length
          ? '✅'
          : '❌'
      }`
    );
    console.log(
      `   Players: ${destCounts.players} (expected: ${
        sourceData.players.length
      }) ${destCounts.players === sourceData.players.length ? '✅' : '❌'}`
    );
    console.log(
      `   Matches: ${destCounts.matches} (expected: ${
        sourceData.matches.length
      }) ${destCounts.matches === sourceData.matches.length ? '✅' : '❌'}`
    );
    console.log(
      `   Fixtures: ${destCounts.fixtures} (expected: ${
        sourceData.fixtures.length
      }) ${destCounts.fixtures === sourceData.fixtures.length ? '✅' : '❌'}`
    );

    // Sample verification with SOURCE vs DESTINATION comparison
    console.log('\n📋 SOURCE vs DESTINATION Verification:');

    // Check 5 random players
    console.log('\n=== PLAYER COMPARISON ===');
    for (let i = 0; i < Math.min(5, sourceData.players.length); i++) {
      const sourcePlayer = sourceData.players[i];
      const destPlayer = await destModels.Player.findById(sourcePlayer._id)
        .populate('country')
        .populate('position')
        .populate('currentClub.club');

      console.log(`\n👤 Player: ${sourcePlayer.name}`);
      console.log(
        `   ID: ${sourcePlayer._id} → ${destPlayer?._id} ${
          sourcePlayer._id.toString() === destPlayer?._id.toString()
            ? '✅'
            : '❌'
        }`
      );

      // Country comparison
      const sourceCountry = sourceData.countries.find(
        (c) => c._id.toString() === sourcePlayer.country?.toString()
      );
      console.log(
        `   Country: ${sourceCountry?.country || 'None'} → ${
          destPlayer?.country?.country || 'None'
        } ${
          sourceCountry?.country === destPlayer?.country?.country ? '✅' : '❌'
        }`
      );

      // Position comparison
      const sourcePosition = sourceData.positions.find(
        (p) => p._id.toString() === sourcePlayer.position?.toString()
      );
      console.log(
        `   Position: ${sourcePosition?.position || 'None'} → ${
          destPlayer?.position?.position || 'None'
        } ${
          sourcePosition?.position === destPlayer?.position?.position
            ? '✅'
            : '❌'
        }`
      );

      // Club comparison
      const sourceClub = sourceData.clubTeams.find(
        (c) => c._id.toString() === sourcePlayer.currentClub?.club?.toString()
      );
      console.log(
        `   Club: ${sourceClub?.name || 'None'} → ${
          destPlayer?.currentClub?.club?.name || 'None'
        } ${
          sourceClub?.name === destPlayer?.currentClub?.club?.name ? '✅' : '❌'
        }`
      );

      // Rating history comparison
      const sourceRatingCount =
        normalizePlayerRatingHistory(sourcePlayer).length;
      const destRatingCount = destPlayer?.ratingHistory?.length || 0;
      console.log(
        `   Rating entries: ${sourceRatingCount} → ${destRatingCount} ${
          sourceRatingCount === destRatingCount ? '✅' : '❌'
        }`
      );
    }

    // Check 3 random matches
    console.log('\n\n=== MATCH COMPARISON ===');
    for (let i = 0; i < Math.min(3, sourceData.matches.length); i++) {
      const sourceMatch = sourceData.matches[i];
      const destMatch = await destModels.Match.findById(sourceMatch._id)
        .populate({
          path: 'homeTeam.team',
          refPath: 'type',
        })
        .populate({
          path: 'awayTeam.team',
          refPath: 'type',
        });

      console.log(`\n⚽ Match at ${sourceMatch.venue}`);
      console.log(
        `   ID: ${sourceMatch._id} → ${destMatch?._id} ${
          sourceMatch._id.toString() === destMatch?._id.toString() ? '✅' : '❌'
        }`
      );
      console.log(
        `   Date: ${new Date(
          sourceMatch.date
        ).toLocaleDateString()} → ${destMatch?.date?.toLocaleDateString()} ${
          new Date(sourceMatch.date).getTime() === destMatch?.date?.getTime()
            ? '✅'
            : '❌'
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
          `   Home: ${sourceHomeTeam?.name} → ${
            destMatch?.homeTeam?.team?.name
          } ${
            sourceHomeTeam?.name === destMatch?.homeTeam?.team?.name
              ? '✅'
              : '❌'
          }`
        );
        console.log(
          `   Away: ${sourceAwayTeam?.name} → ${
            destMatch?.awayTeam?.team?.name
          } ${
            sourceAwayTeam?.name === destMatch?.awayTeam?.team?.name
              ? '✅'
              : '❌'
          }`
        );
      } else {
        const sourceHomeTeam = sourceData.nationalTeams.find(
          (n) => n._id.toString() === sourceMatch.homeTeam.team.toString()
        );
        const sourceAwayTeam = sourceData.nationalTeams.find(
          (n) => n._id.toString() === sourceMatch.awayTeam.team.toString()
        );
        const destHomeTeamName = `${destMatch?.homeTeam?.team?.country} ${destMatch?.homeTeam?.team?.type}`;
        const destAwayTeamName = `${destMatch?.awayTeam?.team?.country} ${destMatch?.awayTeam?.team?.type}`;
        console.log(
          `   Home: ${sourceHomeTeam?.country} ${
            sourceHomeTeam?.type
          } → ${destHomeTeamName} ${
            `${sourceHomeTeam?.country} ${sourceHomeTeam?.type}` ===
            destHomeTeamName
              ? '✅'
              : '❌'
          }`
        );
        console.log(
          `   Away: ${sourceAwayTeam?.country} ${
            sourceAwayTeam?.type
          } → ${destAwayTeamName} ${
            `${sourceAwayTeam?.country} ${sourceAwayTeam?.type}` ===
            destAwayTeamName
              ? '✅'
              : '❌'
          }`
        );
      }

      console.log(
        `   Score: ${sourceMatch.homeTeam.score}-${
          sourceMatch.awayTeam.score
        } → ${destMatch?.homeTeam?.score}-${destMatch?.awayTeam?.score} ${
          sourceMatch.homeTeam.score === destMatch?.homeTeam?.score &&
          sourceMatch.awayTeam.score === destMatch?.awayTeam?.score
            ? '✅'
            : '❌'
        }`
      );
      console.log(
        `   Players: ${sourceMatch.homeTeam.players?.length || 0}/${
          sourceMatch.awayTeam.players?.length || 0
        } → ${destMatch?.homeTeam?.players?.length || 0}/${
          destMatch?.awayTeam?.players?.length || 0
        }`
      );
    }

    // ID preservation check
    console.log('\n\n=== OBJECTID PRESERVATION CHECK ===');
    const randomSourcePlayer =
      sourceData.players[Math.floor(Math.random() * sourceData.players.length)];
    const randomDestPlayer = await destModels.Player.findById(
      randomSourcePlayer._id
    );
    console.log(
      `Random player ID check: ${randomSourcePlayer._id} → ${
        randomDestPlayer?._id
      } ${randomDestPlayer ? '✅ EXACT MATCH' : '❌ NOT FOUND'}`
    );

    const randomSourceMatch =
      sourceData.matches[Math.floor(Math.random() * sourceData.matches.length)];
    const randomDestMatch = await destModels.Match.findById(
      randomSourceMatch._id
    );
    console.log(
      `Random match ID check: ${randomSourceMatch._id} → ${
        randomDestMatch?._id
      } ${randomDestMatch ? '✅ EXACT MATCH' : '❌ NOT FOUND'}`
    );

    // Test aggregation
    console.log('\n🧮 Testing aggregation pipeline...');
    const topClubs = await destModels.ClubTeam.aggregate([
      {
        $lookup: {
          from: 'players',
          let: { clubId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$currentClub.club', '$$clubId'] },
              },
            },
            {
              $project: {
                totalRating: { $sum: '$ratingHistory.newRating' },
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
      { $sort: { rating: -1 } },
      { $limit: 3 },
    ]);

    console.log('Top 3 clubs by rating:');
    topClubs.forEach((club, i) => {
      console.log(`   ${i + 1}. ${club.name}: ${club.rating}`);
    });

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
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
console.log('🚀 Starting FAST database migration with preserved ObjectIds...');
migrateDatabase()
  .then(() => {
    console.log('✅ Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
