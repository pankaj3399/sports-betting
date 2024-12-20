const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
    position: {
        type: String,
        required: true,
        enum: ['Attacking Midfield', 'Center Forward', 'Central Midfield', 'Centre Back', 'Coach', 'Defensive Midfield', 'Goalkeeper', 'Left Back', 'Left Winger', 'Right Back', 'Right Winger', 'Second Stricker'],
        unique: true
    }
});

const Position = mongoose.model('Position', positionSchema);

module.exports = Position;
