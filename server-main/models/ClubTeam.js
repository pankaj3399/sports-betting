const mongoose = require('mongoose');

const ClubTeamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Inactive'],
        default: 'Active'

    }
},{
    collection: 'clubteams' // Explicitly set collection name
});

ClubTeamSchema.index({ "name": 1 });
const ClubTeam = mongoose.model('ClubTeam', ClubTeamSchema);
module.exports = ClubTeam;