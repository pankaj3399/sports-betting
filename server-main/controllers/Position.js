const Position = require('../models/Position');

module.exports = {

    // get all positions
    async fetchAll(req, res) {
        try {
            const positions = await Position.find();
            return res.status(200).send(positions);
        } catch (error) {
            return res.status(400).send(error);
        }
    },
}