const Country = require("../models/Country");
const NationalTeam = require("../models/NationalTeams");
const Player = require("../models/Player");
// Country controller
module.exports = {
  async fetchAll(req, res) {
    try {
      const countries = await Country.find();
      // Just send the country names array
      const countryNamesWithId = countries.map((country) => ({ name: country.country, _id: country._id }));
      return res.status(200).send(countryNamesWithId);

    } catch (error) {
      return res.status(400).send(error);
    }
  },

  async fetchAllNationalTeamsByCountry(req, res) {
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
    const {
      page = 1,
      limit = 10,
      sortBy = "country",
      sortOrder = "asc",
      search = "",
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum <= 0 || limitNum <= 0) {
      return res
        .status(400)
        .json({ message: "Page and limit must be positive integers." });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const pipeline = [
      {
        $match: {
          country: { $regex: search, $options: "i" },
        },
      },
      {
        $lookup: {
          from: "players",
          let: { country: "$country", type: "$type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$country", "$nationalTeams.name"] },
                    { $in: ["$$type", "$nationalTeams.type"] },
                    { 
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: "$nationalTeams",
                              as: "team",
                              cond: { $eq: ["$$team.to", null] }
                            }
                          }
                        },
                        0
                      ]
                    } 
                  ],
                },
              },
            },
            {
              $project: {
                totalRating: {
                  $sum: "$ratingHistory.newRating",
                },
                // CALCULATE NetRating dynamically
                totalNetRating: {
                  $sum: {
                    $map: {
                      input: "$ratingHistory",
                      as: "rating",
                      in: {
                        $let: {
                          vars: {
                            daysDiff: {
                              $floor: {
                                $divide: [
                                  {
                                    $subtract: [
                                      new Date(),
                                      "$$rating.date"
                                    ]
                                  },
                                  1000 * 60 * 60 * 24
                                ]
                              }
                            }
                          },
                          in: {
                            $cond: [
                              { $lt: ["$$daysDiff", 0] },
                              0,
                              {
                                $cond: [
                                  { $gte: ["$$daysDiff", 1461] },
                                  0,
                                  {
                                    $multiply: [
                                      "$$rating.newRating",
                                      {
                                        $divide: [
                                          { $subtract: [1461, "$$daysDiff"] },
                                          1461
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              },
            },
          ],
          as: "players",
        },
      },
      {
        $addFields: {
          rating: { $sum: "$players.totalRating" },
          netRating: { $sum: "$players.totalNetRating" },
        },
      },
      {
        $project: {
          country: 1,
          type: 1,
          _id: 1,
          rating: 1,
          netRating: 1
        },
      },
      {
        $sort: sortOptions,
      },
      {
        $skip: (pageNum - 1) * limitNum,
      },
      {
        $limit: limitNum,
      },
    ];

    const totalTeamsPipeline = [
      {
        $match: {
          country: { $regex: search, $options: "i" },
        },
      },
      {
        $count: "totalTeams",
      },
    ];

    const [teams, totalTeamsResult] = await Promise.all([
      NationalTeam.aggregate(pipeline),
      NationalTeam.aggregate(totalTeamsPipeline),
    ]);

    const totalTeams = totalTeamsResult[0]?.totalTeams || 0;

    const response = {
      totalTeams,
      totalPages: Math.ceil(totalTeams / limitNum),
      currentPage: pageNum,
      teams,
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
      }).populate('country').populate('position');

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
