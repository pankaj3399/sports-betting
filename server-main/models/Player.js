// models/Player.js
const mongoose = require('mongoose');

const PreviousClubSchema = new mongoose.Schema({
    name: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubTeam', required: true },
    from: { type: Date, required: true },
    to: { type: Date }
});

const NationalTeamSchema = new mongoose.Schema({
    name: { type: String },
    from: { type: Date },
    type: { type: String },
    to: { type: Date}
});

const RatingHistorySchema = new mongoose.Schema({
    date: { type: Date, required: true },
    newRating: { type: Number, required: true },
    type: { 
        type: String, 
        enum: ['match', 'manual'], 
        default: 'match' 
    },
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' }
});



const PlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true },
    currentClub: {
        club: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubTeam' },
        from: { type: Date }
    },
    country: { type: String, required: true },    nationalTeams: [NationalTeamSchema],
    previousClubs: [PreviousClubSchema],
    ratingHistory: [RatingHistorySchema]
});

module.exports = mongoose.model('Player', PlayerSchema);