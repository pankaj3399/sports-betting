const mongoose = require("mongoose");

const fixtureSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["ClubTeam", "NationalTeam"],
    default: "ClubTeam",
  },
  date: {
    type: Date,
    required: true,
  },
  hour: {
    type: String,
    required: true,
  },
  venue: {
    type: String,
    required: true,
  },
  league: {
    type: String,
  },
  homeTeam: {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "type",
    },
  },
  awayTeam: {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "type",
    },
  },
});

const Fixture = mongoose.model("Fixture", fixtureSchema);
module.exports = Fixture;
