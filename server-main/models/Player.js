// models/Player.js
const mongoose = require("mongoose");

const PreviousClubSchema = new mongoose.Schema({
  name: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClubTeam",
    required: true,
  },
  from: { type: Date, required: true },
  to: { type: Date },
});

const NationalTeamSchema = new mongoose.Schema({
  name: { type: String },
  from: { type: Date },
  type: { type: String },
  to: { type: Date },
});

const RatingHistorySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  newRating: { type: Number, required: true },
  netRating: { type: Number, default: 0 },
  type: {
    type: String,
    enum: ["match", "manual"],
    default: "match",
  },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match" },
});

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Position",
    required: true,
  },
  currentClub: {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "ClubTeam" },
    from: { type: Date },
  },
  country: { type: String, required: true },
  nationalTeams: [NationalTeamSchema],
  previousClubs: [PreviousClubSchema],
  ratingHistory: [RatingHistorySchema],
});

PlayerSchema.index({ name: 1, dateOfBirth: 1 }, { unique: true });

PlayerSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (update.$push && update.$push.ratingHistory) {
    const pushedEntry = update.$push.ratingHistory;
    if (pushedEntry.date && pushedEntry.newRating) {
      const currentDate = new Date();
      const matchDate = new Date(pushedEntry.date);
      const differenceInDays = Math.floor(
        (currentDate - matchDate) / (24 * 60 * 60 * 1000)
      );

      pushedEntry.netRating =
        ((1461 - differenceInDays) / 1461) * pushedEntry.newRating;

      if (pushedEntry.netRating < 0) {
        pushedEntry.netRating = 0;
      }

      update.$push.ratingHistory = pushedEntry;
    }
  }

  next();
});

module.exports = mongoose.model("Player", PlayerSchema);
