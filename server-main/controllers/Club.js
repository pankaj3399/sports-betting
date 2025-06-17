const Club = require("../models/ClubTeam");
const Player = require("../models/Player");
module.exports = {
  // create a new club
  async create(req, res) {
    try {
      const name = req.body.name;
      if (!name) {
        return res.status(400).send({ message: "Club name is required" });
      }
      const existingClub = await Club.findOne({
        name,
      });
      if (existingClub) {
        return res.status(409).send({ message: "Club already exists" });
      }
      const club = await Club.create({ name, status: "Active" });
      return res.status(201).send(club);
    } catch (error) {
      return res.status(400).send(error);
    }
  },

async fetchAll(req, res) {
  try {
    const {
      page = 1,
      perPage = 10,
      search = "",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(perPage, 10);

    if (pageNum <= 0 || limitNum <= 0) {
      return res
        .status(400)
        .json({ message: "Page and perPage must be positive integers." });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const pipeline = [
      {
        $match: {
          name: { $regex: search, $options: "i" },
        },
      },
      {
        $lookup: {
          from: "players",
          let: { clubId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$currentClub.club", "$$clubId"],
                },
              },
            },
            {
              $project: {
                totalRating: {
                  $sum: "$ratingHistory.newRating",
                },
                // CALCULATE NetRating dynamically based on current date
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
                                      new Date(), // Current date
                                      "$$rating.date"
                                    ]
                                  },
                                  1000 * 60 * 60 * 24 // Convert to days
                                ]
                              }
                            }
                          },
                          in: {
                            $cond: [
                              { $lt: ["$$daysDiff", 0] }, // Future date
                              0,
                              {
                                $cond: [
                                  { $gte: ["$$daysDiff", 1461] }, // Older than 4 years
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
          name: 1,
          _id: 1,
          rating: 1,
          netRating: 1,
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

    const totalPipeline = [
      {
        $match: {
          name: { $regex: search, $options: "i" },
        },
      },
      {
        $count: "total",
      },
    ];

    const [clubs, totalResult] = await Promise.all([
      Club.aggregate(pipeline),
      Club.aggregate(totalPipeline),
    ]);

    const total = totalResult[0]?.total || 0;

    return res.status(200).json({
      clubs,
      total,
      page: pageNum,
      perPage: limitNum,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Error fetching clubs", error: error.message });
  }
}
,

  async fetchAllActive(req, res) {
    try {
      const clubs = await Club.find({ status: "Active" }).sort("name");
      return res.status(200).send(clubs);
    } catch (error) {
      return res.status(400).send(error);
    }
  },
  // fetch a single club
  async fetch(req, res) {
    try {
      const club = await Club.findById(req.params.id);
      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }
      return res.status(200).send(club);
    } catch (error) {
      return res.status(400).send(error);
    }
  },
  // update a club
  async update(req, res) {
    try {
      const club = await Club.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }
      return res.status(200).send(club);
    } catch (error) {
      return res.status(400).send(error);
    }
  },
  // delete a club
  async delete(req, res) {
    try {
      const club = await Club.findByIdAndDelete(req.params.id);
      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }
      return res.status(200).send({ message: "Club deleted successfully" });
    } catch (error) {
      return res.status(400).send(error);
    }
  },
  //fetching all players
  async fetchPlayers(req, res) {
    try {
      const clubId = req.params.id;
      const date = req.query.date;
      // console.log('Backend: Received request for club ID:', clubId, 'Date:', date);

      let query;

      if (date) {
        // If date is provided, find players who were in the club on that date
        const matchDate = new Date(date);
        query = {
          $or: [
            {
              "currentClub.club": clubId,
              "currentClub.from": { $lte: matchDate },
            },
            {
              previousClubs: {
                $elemMatch: {
                  name: clubId,
                  from: { $lte: matchDate },
                  $or: [{ to: { $gte: matchDate } }, { to: null }],
                },
              },
            },
          ],
        };
      } else {
        // If no date, return only current squad
        query = { "currentClub.club": clubId };
      }

      const players = await Player.find(query)
        .populate("country")
        .populate("position")
        .sort("name");

      // console.log(`Backend: Found ${players.length} players for club ${clubId}`);

      return res.status(200).json(players);
    } catch (error) {
      console.error("Backend Error:", error);
      return res.status(400).json({ error: error.message });
    }
  },
};
