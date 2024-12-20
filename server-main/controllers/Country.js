const Country = require('../models/Country');
const NationalTeam = require('../models/NationalTeams');
const Player = require('../models/Player');
// Country controller
module.exports = {
    async fetchAll(req, res) {
        try {
            const countries = await Country.find();
            // Just send the country names array
            const countryNames = countries.map(country => country.country);
            return res.status(200).send(countryNames);
        } catch (error) {
            return res.status(400).send(error);
        }
    },
    
    async fetchAllNationalTeams(req, res) {
        try {
            const { country } = req.query;
            const nationalTeams = await NationalTeam.find({ country })
                .select('country type _id'); // Only select needed fields
            return res.status(200).send(nationalTeams);
        } catch (error) {
            return res.status(400).send(error);
        }
    },
    async fetchAllNationalTeams(req, res) {
        try {
            const { country } = req.query;
            const nationalTeams = await NationalTeam.find({ country })
                .select('country type _id');
            return res.status(200).send(nationalTeams);
        } catch (error) {
            return res.status(400).send(error);
        }
    },

    async getNationalTeamPlayers(req, res) {
        try {
            const { teamId } = req.params;
            const date = req.query.date ? new Date(req.query.date) : new Date();
            
            console.log('Fetching players for team:', teamId);
            console.log('Date:', date);
    
            const nationalTeam = await NationalTeam.findById(teamId);
            if (!nationalTeam) {
                return res.status(404).json({ message: 'National team not found' });
            }

            // Updated query to check both country and type
            const players = await Player.find({
                'nationalTeams': {
                    $elemMatch: {
                        name: nationalTeam.country, // Match the specific country
                        type: nationalTeam.type,    // Match the specific team type
                        from: { $lte: date },
                        $or: [
                            { to: null },
                            { to: { $gt: date } }
                        ]
                    }
                }
            })
            .select('name position _id')
            .populate('position', 'name')
            .lean();

            // console.log(`Found ${players.length} players for ${nationalTeam.country} ${nationalTeam.type}`);
            
            return res.status(200).json(players);
        } catch (error) {
            console.error('Error details:', error);
            return res.status(500).json({ 
                message: 'Error fetching national team players',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
}