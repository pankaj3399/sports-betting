// routes/Player.js
const { create, updatePlayer, fetchAllPlayers } = require('../controllers/Player');

const router = require('express').Router();

router.get('/players', fetchAllPlayers);
router.put('/players/:id', updatePlayer);
router.post('/', create);

module.exports = router;