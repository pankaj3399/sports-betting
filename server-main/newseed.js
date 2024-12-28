const mongoose = require("mongoose");
const NationalTeam = require("./models/NationalTeams");
require("dotenv").config();

const ukTeams = [
  { England: ["U-17", "U-19", "U-21", "A"] },
  { "Northern Ireland": ["U-17", "U-19", "U-21", "A"] },
  { Scotland: ["U-17", "U-19", "U-21", "A"] },
  { Wales: ["U-17", "U-19", "U-21", "A"] }
];

const addUKTeams = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Prepare the national team data
    const nationalTeamData = [];
    
    ukTeams.forEach(teamObj => {
      const country = Object.keys(teamObj)[0];
      const types = teamObj[country];
      
      types.forEach(type => {
        nationalTeamData.push({
          country,
          type,
          status: "Active"
        });
      });
    });

    // Insert the new teams
    const nationalTeamDocs = await NationalTeam.insertMany(nationalTeamData);

    // Log summary
    console.log('\nUK National Teams added successfully:');
    console.log(`Total teams added: ${nationalTeamDocs.length}`);

    // Detailed logging
    nationalTeamDocs.forEach(team => {
      console.log(`Added: ${team.country} ${team.type}`);
    });

    await mongoose.connection.close();
    console.log("\nDatabase connection closed");

  } catch (error) {
    console.error("Error adding UK teams:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

addUKTeams();