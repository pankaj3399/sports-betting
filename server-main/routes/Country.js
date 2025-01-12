const { fetchAll, fetchAllNationalTeams,getNationalTeamPlayers, fetchAllNationalTeamsByCountry } = require('../controllers/Country');

const router = require('express').Router();

router.get('/', fetchAll);
router.get('/national-teams/all', fetchAllNationalTeams);
router.get('/national-teams', fetchAllNationalTeamsByCountry);
router.get('/national-teams/:teamId/players', getNationalTeamPlayers);


module.exports = router;