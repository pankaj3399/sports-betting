// routes/Player.js
const { create, updatePlayer } = require('../controllers/Player');

const router = require('express').Router();

router.put('/players/:id', updatePlayer);

router.post('/', create);

module.exports = router;