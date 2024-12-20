const { fetchAll, fetchAllNationalTeams,getNationalTeamPlayers } = require('../controllers/Country');

const router = require('express').Router();

router.get('/', fetchAll);
router.get('/national-teams', fetchAllNationalTeams);
router.get('/national-teams/:teamId/players', getNationalTeamPlayers);

module.exports = router;