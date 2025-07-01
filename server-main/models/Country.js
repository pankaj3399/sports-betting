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

countrySchema.index({ "country": 1 });
const Country = mongoose.model('Country', countrySchema);
module.exports = Country;
