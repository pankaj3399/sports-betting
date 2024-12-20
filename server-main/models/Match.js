const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["ClubTeam", "NationalTeam"],
      default: "ClubTeam",
    },
    rating: {
      homeTeamRating: {
        type: Number,
      },
      awayTeamRating: {
        type: Number,
      },
    },
    homeTeam: {
      team: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // Will be populated based on type
        refPath: "type",
      },
      score: {
        type: Number,
        required: true,
        min: 0,
      },
      players: [
        {
          player: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
            required: true,
          },
          starter: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    awayTeam: {
      team: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // Will be populated based on type
        refPath: "type",
      },
      score: {
        type: Number,
        required: true,
        min: 0,
      },
      players: [
        {
          player: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
            required: true,
          },
          starter: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    date: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value <= new Date();
        },
        message: "Match date must be in the past",
      },
    },
    venue: {
      type: String,
      required: true,
    },
    odds: {
      homeWin: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      draw: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      awayWin: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
    },
  },
  {
    timestamps: true,
    discriminatorKey: "type",
  }
);

// Add compound index for unique matches
MatchSchema.index(
  {
    date: 1,
    venue: 1,
    "homeTeam.team": 1,
    "awayTeam.team": 1,
    type: 1,
  },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  }
);

// Pre-save middleware for venue trimming
MatchSchema.pre("validate", function (next) {
  if (this.venue) {
    this.venue = this.venue.trim();
  }
  next();
});

// Check for duplicate matches
MatchSchema.pre("save", async function (next) {
  const existingMatch = await this.constructor.findOne({
    date: new Date(this.date).setHours(0, 0, 0, 0),
    venue: this.venue,
    type: this.type,
    $or: [
      {
        "homeTeam.team": this.homeTeam.team,
        "awayTeam.team": this.awayTeam.team,
      },
      {
        "homeTeam.team": this.awayTeam.team,
        "awayTeam.team": this.homeTeam.team,
      },
    ],
  });

  if (existingMatch && (!this._id || !existingMatch._id.equals(this._id))) {
    throw new Error(
      "A match between these teams at this venue and date already exists"
    );
  }
  next();
});

// Ensure teams are different
MatchSchema.pre("save", function (next) {
  if (this.homeTeam.team.equals(this.awayTeam.team)) {
    return next(new Error("Home team and away team cannot be the same"));
  }
  next();
});

// Validate odds
MatchSchema.pre("save", function (next) {
  const { homeWin, draw, awayWin } = this.odds;
  const total = Number(homeWin) + Number(draw) + Number(awayWin);

  // Check individual probabilities
  if (
    homeWin < 0 ||
    draw < 0 ||
    awayWin < 0 ||
    homeWin > 1 ||
    draw > 1 ||
    awayWin > 1
  ) {
    return next(new Error("Individual odds must be between 0 and 1"));
  }

  // Allow for a 10% margin in total probability
  if (total < 0.9 || total > 1.1) {
    return next(
      new Error(
        `Match odds probabilities should roughly sum to 1. Current sum: ${total.toFixed(
          4
        )}`
      )
    );
  }
  next();
});

// Helper method to get the correct model name based on match type
MatchSchema.methods.getTeamModel = function () {
  return this.type === "ClubTeam" ? "ClubTeam" : "NationalTeam";
};

const Match = mongoose.model("Match", MatchSchema);

module.exports = Match;
