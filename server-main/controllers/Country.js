const Country = require("../models/Country");
const NationalTeam = require("../models/NationalTeams");
const Player = require("../models/Player");
// Country controller
module.exports = {
  async fetchAll(req, res) {
    try {
      const countries = await Country.find();
      // Just send the country names array
      const countryNames = countries.map((country) => country.country);
      return res.status(200).send(countryNames);
    } catch (error) {
      return res.status(400).send(error);
    }
  },

  // async fetchAllNationalTeams(req, res) {
  //     try {
  //         const { country } = req.query;
  //         const nationalTeams = await NationalTeam.find({ country })
  //             .select('country type _id'); // Only select needed fields
  //         return res.status(200).send(nationalTeams);
  //     } catch (error) {
  //         return res.status(400).send(error);
  //     }
  // },

  async fetchAllNationalTeams(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "country",
        sortOrder = "asc",
        search,
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (pageNum <= 0 || limitNum <= 0) {
        return res
          .status(400)
          .json({ message: "Page and limit must be positive integers." });
      }

      const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limitNum, 10) || 10,
        search: search || "",
      };

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder;

      const nationalTeams = await NationalTeam.find({
        country: { $regex: options.search, $options: "i" },
      })
        .sort(sortOptions)
        .select("country type _id")
        .lean();

      const totalTeams = await NationalTeam.countDocuments();

      const teamsWithRatings = await Promise.all(
        nationalTeams.map(async (team) => {
          const players = await Player.find({
            nationalTeams: {
              $elemMatch: {
                name: team.country,
                type: team.type,
              },
            },
          }).select("ratingHistory");

          const totalRating = players.reduce((sum, player) => {
            const playerTotalRating = Array.isArray(player.ratingHistory)
              ? player.ratingHistory.reduce(
                  (a, currRating) => a + currRating.newRating,
                  0
                )
              : 0;
            return sum + playerTotalRating;
          }, 0);

          return {
            ...team,
            rating: totalRating,
          };
        })
      );

      const sortedTeams =
        sortBy === "rating"
          ? teamsWithRatings.sort((a, b) =>
              sortOrder === "asc" ? a.rating - b.rating : b.rating - a.rating
            )
          : teamsWithRatings;

      const paginatedTeams = sortedTeams.slice(
        (options.page - 1) * options.limit,
        options.page * options.limit
      );

      const response = {
        totalTeams,
        totalPages: Math.ceil(totalTeams / limitNum),
        currentPage: pageNum,
        teams: paginatedTeams,
      };

      return res.status(200).json(response);
    } catch (error) {
      return res.status(400).json({
        message: "Error fetching national teams",
        error: error.message,
      });
    }
  },
  async getNationalTeamPlayers(req, res) {
    try {
      const { teamId } = req.params;
      const date = req.query.date ? new Date(req.query.date) : new Date();

      console.log("Fetching players for team:", teamId);
      console.log("Date:", date);

      const nationalTeam = await NationalTeam.findById(teamId);
      if (!nationalTeam) {
        return res.status(404).json({ message: "National team not found" });
      }

      // Updated query to check both country and type
      const players = await Player.find({
        nationalTeams: {
          $elemMatch: {
            name: nationalTeam.country, // Match the specific country
            type: nationalTeam.type, // Match the specific team type
            from: { $lte: date },
            $or: [{ to: null }, { to: { $gt: date } }],
          },
        },
      }).lean();

      // console.log(`Found ${players.length} players for ${nationalTeam.country} ${nationalTeam.type}`);

      return res.status(200).json(players);
    } catch (error) {
      console.error("Error details:", error);
      return res.status(500).json({
        message: "Error fetching national team players",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
};
