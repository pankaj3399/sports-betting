const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
    country: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Inactive']
    },
},{
    collection: 'countries'
});

const Country = mongoose.model('Country', countrySchema);
module.exports = Country;
