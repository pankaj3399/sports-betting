
const mongoose = require("mongoose");
const Country = require("./models/Country");
const ClubTeam = require("./models/ClubTeam");
const Position = require("./models/Position");
const NationalTeam = require("./models/NationalTeams");
const Player = require("./models/Player");
const Match = require("./models/Match");
const Fixture = require("./models/Fixtures");
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

const migrateDatabase = async () => {
  let sourceConnection = null;
  let destinationConnection = null;

  try {
    console.log("🔄 Starting database migration...");
    
    // Connect to source database
    console.log("📡 Connecting to source database...");
    sourceConnection = createConnection(SOURCE_MONGO_URI);
    await new Promise((resolve, reject) => {
      sourceConnection.on('connected', resolve);
      sourceConnection.on('error', reject);
    });
    console.log("✅ Connected to source database");

    // Connect to destination database
    console.log("📡 Connecting to destination database...");
    destinationConnection = createConnection(DESTINATION_MONGO_URI);
    await new Promise((resolve, reject) => {
      destinationConnection.on('connected', resolve);
      destinationConnection.on('error', reject);
    });
    console.log("✅ Connected to destination database");

    // Get models for both connections
    const sourceModels = getModels(sourceConnection);
    const destModels = getModels(destinationConnection);

    // Step 1: Fetch all data from source database
    console.log("\n📥 Fetching data from source database...");
    
    const sourceData = {
      countries: await sourceModels.Country.find({}).lean(),
      positions: await sourceModels.Position.find({}).lean(),
      clubTeams: await sourceModels.ClubTeam.find({}).lean(),
      nationalTeams: await sourceModels.NationalTeam.find({}).lean(),
      players: await sourceModels.Player.find({}).lean(),
      matches: await sourceModels.Match.find({}).lean(),
      fixtures: await sourceModels.Fixture.find({}).lean(),
    };

    console.log("📊 Source data summary:");
    console.log(`   Countries: ${sourceData.countries.length}`);
    console.log(`   Positions: ${sourceData.positions.length}`);
    console.log(`   Club Teams: ${sourceData.clubTeams.length}`);
    console.log(`   National Teams: ${sourceData.nationalTeams.length}`);
    console.log(`   Players: ${sourceData.players.length}`);
    console.log(`   Matches: ${sourceData.matches.length}`);
    console.log(`   Fixtures: ${sourceData.fixtures.length}`);

    // Step 2: Clear destination database (optional - uncomment if needed)
    console.log("\n🗑️  Clearing destination database...");
    await Promise.all([
      destModels.Match.deleteMany({}),
      destModels.Fixture.deleteMany({}),
      destModels.Player.deleteMany({}),
      destModels.NationalTeam.deleteMany({}),
      destModels.ClubTeam.deleteMany({}),
      destModels.Position.deleteMany({}),
      destModels.Country.deleteMany({}),
    ]);
    console.log("✅ Destination database cleared");

    // Step 3: Create ID mapping for referenced documents
    const idMappings = {
      countries: new Map(),
      positions: new Map(),
      clubTeams: new Map(),
      nationalTeams: new Map(),
      players: new Map(),
    };

    // Step 4: Insert data in order (maintaining referential integrity)
    
    // Insert Countries first (no dependencies)
    console.log("\n📝 Inserting countries...");
    if (sourceData.countries.length > 0) {
      const countriesData = sourceData.countries.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedCountries = await destModels.Country.insertMany(countriesData);
      sourceData.countries.forEach((original, index) => {
        idMappings.countries.set(original._id.toString(), insertedCountries[index]._id);
      });
      console.log(`✅ Inserted ${insertedCountries.length} countries`);
    }

    // Insert Positions (no dependencies)
    console.log("📝 Inserting positions...");
    if (sourceData.positions.length > 0) {
      const positionsData = sourceData.positions.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedPositions = await destModels.Position.insertMany(positionsData);
      sourceData.positions.forEach((original, index) => {
        idMappings.positions.set(original._id.toString(), insertedPositions[index]._id);
      });
      console.log(`✅ Inserted ${insertedPositions.length} positions`);
    }

    // Insert Club Teams (no dependencies)
    console.log("📝 Inserting club teams...");
    if (sourceData.clubTeams.length > 0) {
      const clubTeamsData = sourceData.clubTeams.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedClubTeams = await destModels.ClubTeam.insertMany(clubTeamsData);
      sourceData.clubTeams.forEach((original, index) => {
        idMappings.clubTeams.set(original._id.toString(), insertedClubTeams[index]._id);
      });
      console.log(`✅ Inserted ${insertedClubTeams.length} club teams`);
    }

    // Insert National Teams (depends on countries indirectly)
    console.log("📝 Inserting national teams...");
    if (sourceData.nationalTeams.length > 0) {
      const nationalTeamsData = sourceData.nationalTeams.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      });
      const insertedNationalTeams = await destModels.NationalTeam.insertMany(nationalTeamsData);
      sourceData.nationalTeams.forEach((original, index) => {
        idMappings.nationalTeams.set(original._id.toString(), insertedNationalTeams[index]._id);
      });
      console.log(`✅ Inserted ${insertedNationalTeams.length} national teams`);
    }

    // Insert Players (depends on countries, positions, clubTeams)
    console.log("📝 Inserting players...");
    if (sourceData.players.length > 0) {
      const playersData = sourceData.players.map(doc => {
        const { _id, ...player } = doc;
        
        // Update country reference
        if (player.country && idMappings.countries.has(player.country.toString())) {
          player.country = idMappings.countries.get(player.country.toString());
        }

        // Update position reference
        if (player.position && idMappings.positions.has(player.position.toString())) {
          player.position = idMappings.positions.get(player.position.toString());
        }

        // Update current club reference
        if (player.currentClub && player.currentClub.club && 
            idMappings.clubTeams.has(player.currentClub.club.toString())) {
          player.currentClub.club = idMappings.clubTeams.get(player.currentClub.club.toString());
        }

        // Update previous clubs references
        if (player.previousClubs && player.previousClubs.length > 0) {
          player.previousClubs = player.previousClubs.map(club => {
            if (club.name && idMappings.clubTeams.has(club.name.toString())) {
              club.name = idMappings.clubTeams.get(club.name.toString());
            }
            return club;
          });
        }

        return player;
      });
      
      const insertedPlayers = await destModels.Player.insertMany(playersData);
      sourceData.players.forEach((original, index) => {
        idMappings.players.set(original._id.toString(), insertedPlayers[index]._id);
      });
      console.log(`✅ Inserted ${insertedPlayers.length} players`);
    }

    // Insert Matches (depends on clubTeams, nationalTeams, players)
    console.log("📝 Inserting matches...");
    if (sourceData.matches.length > 0) {
      const matchesData = sourceData.matches.map(doc => {
        const { _id, ...match } = doc;
        
        // Update home team reference
        if (match.homeTeam && match.homeTeam.team) {
          const teamId = match.homeTeam.team.toString();
          if (match.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            match.homeTeam.team = idMappings.clubTeams.get(teamId);
          } else if (match.type === 'NationalTeam' && idMappings.nationalTeams.has(teamId)) {
            match.homeTeam.team = idMappings.nationalTeams.get(teamId);
          }
        }

        // Update away team reference
        if (match.awayTeam && match.awayTeam.team) {
          const teamId = match.awayTeam.team.toString();
          if (match.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            match.awayTeam.team = idMappings.clubTeams.get(teamId);
          } else if (match.type === 'NationalTeam' && idMappings.nationalTeams.has(teamId)) {
            match.awayTeam.team = idMappings.nationalTeams.get(teamId);
          }
        }

        // Update player references in both teams
        if (match.homeTeam && match.homeTeam.players) {
          match.homeTeam.players = match.homeTeam.players.map(playerObj => {
            if (playerObj.player && idMappings.players.has(playerObj.player.toString())) {
              playerObj.player = idMappings.players.get(playerObj.player.toString());
            }
            return playerObj;
          });
        }

        if (match.awayTeam && match.awayTeam.players) {
          match.awayTeam.players = match.awayTeam.players.map(playerObj => {
            if (playerObj.player && idMappings.players.has(playerObj.player.toString())) {
              playerObj.player = idMappings.players.get(playerObj.player.toString());
            }
            return playerObj;
          });
        }

        return match;
      });

      const insertedMatches = await destModels.Match.insertMany(matchesData);
      console.log(`✅ Inserted ${insertedMatches.length} matches`);
    }

    // Insert Fixtures (depends on clubTeams, nationalTeams)
    console.log("📝 Inserting fixtures...");
    if (sourceData.fixtures.length > 0) {
      const fixturesData = sourceData.fixtures.map(doc => {
        const { _id, ...fixture } = doc;
        
        // Update home team reference
        if (fixture.homeTeam && fixture.homeTeam.team) {
          const teamId = fixture.homeTeam.team.toString();
          if (fixture.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            fixture.homeTeam.team = idMappings.clubTeams.get(teamId);
          } else if (fixture.type === 'NationalTeam' && idMappings.nationalTeams.has(teamId)) {
            fixture.homeTeam.team = idMappings.nationalTeams.get(teamId);
          }
        }

        // Update away team reference
        if (fixture.awayTeam && fixture.awayTeam.team) {
          const teamId = fixture.awayTeam.team.toString();
          if (fixture.type === 'ClubTeam' && idMappings.clubTeams.has(teamId)) {
            fixture.awayTeam.team = idMappings.clubTeams.get(teamId);
          } else if (fixture.type === 'NationalTeam' && idMappings.nationalTeams.has(teamId)) {
            fixture.awayTeam.team = idMappings.nationalTeams.get(teamId);
          }
        }

        return fixture;
      });

      const insertedFixtures = await destModels.Fixture.insertMany(fixturesData);
      console.log(`✅ Inserted ${insertedFixtures.length} fixtures`);
    }

    // Step 5: Verification
    console.log("\n🔍 Verifying migration...");
    const destData = {
      countries: await destModels.Country.countDocuments(),
      positions: await destModels.Position.countDocuments(),
      clubTeams: await destModels.ClubTeam.countDocuments(),
      nationalTeams: await destModels.NationalTeam.countDocuments(),
      players: await destModels.Player.countDocuments(),
      matches: await destModels.Match.countDocuments(),
      fixtures: await destModels.Fixture.countDocuments(),
    };

    console.log("📊 Destination data summary:");
    console.log(`   Countries: ${destData.countries}`);
    console.log(`   Positions: ${destData.positions}`);
    console.log(`   Club Teams: ${destData.clubTeams}`);
    console.log(`   National Teams: ${destData.nationalTeams}`);
    console.log(`   Players: ${destData.players}`);
    console.log(`   Matches: ${destData.matches}`);
    console.log(`   Fixtures: ${destData.fixtures}`);

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
      console.log("\n🎉 Migration completed successfully! All data counts match.");
    } else {
      console.log("\n⚠️  Migration completed but some data counts don't match. Please review.");
    }

    // Sample verification queries
    console.log("\n🔍 Running sample verification queries...");
    
    // Check if a player with references exists
    const samplePlayer = await destModels.Player.findOne()
      .populate('position')
      .populate('country')
      .populate('currentClub.club');
    
    if (samplePlayer) {
      console.log("\n📋 Sample player verification:");
      console.log(`   Name: ${samplePlayer.name}`);
      console.log(`   Position: ${samplePlayer.position?.position || 'N/A'}`);
      console.log(`   Country: ${samplePlayer.country?.country || 'N/A'}`);
      console.log(`   Current Club: ${samplePlayer.currentClub?.club?.name || 'N/A'}`);
    }

    // Check if a match with references exists
    const sampleMatch = await destModels.Match.findOne();
    if (sampleMatch) {
      console.log("\n⚽ Sample match verification:");
      console.log(`   Match ID: ${sampleMatch._id}`);
      console.log(`   Type: ${sampleMatch.type}`);
      console.log(`   Date: ${sampleMatch.date}`);
      console.log(`   Venue: ${sampleMatch.venue}`);
      console.log(`   Score: ${sampleMatch.homeTeam.score} - ${sampleMatch.awayTeam.score}`);
    }

  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.close();
      console.log("🔌 Source database connection closed");
    }
    if (destinationConnection) {
      await destinationConnection.close();
      console.log("🔌 Destination database connection closed");
    }
  }
};

// Run the migration
console.log("🚀 Starting database migration process...");
migrateDatabase()
  .then(() => {
    console.log("✅ Migration process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });