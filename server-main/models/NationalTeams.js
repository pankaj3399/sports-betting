const mongoose = require('mongoose');

const nationalTeamSchema = new mongoose.Schema({
    country: {
        type: String,
        required: [true, 'Country is required'],
    },
    type: {
        type: String,
        required: true,
        enum: ['U-17', 'U-19', 'U-21', 'A']
    },
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Inactive']
    },
}, {
    collection: 'nationalteams' 
});

nationalTeamSchema.index({ "country": 1, "type": 1 });
const NationalTeam = mongoose.model('NationalTeam', nationalTeamSchema);
module.exports = NationalTeam;