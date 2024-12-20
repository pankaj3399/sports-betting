const { fetchAll } = require('../controllers/Position');

const router = require('express').Router();

router.get('/', fetchAll);

module.exports = router;