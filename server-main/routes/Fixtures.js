const express = require("express");
const Fixture = require("../models/Fixtures");
const router = express.Router();

router.get("/get-all-fixtures", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "date",
      sortOrder = "asc",
      search = "",
    } = req.query;

    const matchStage = {};

    const sortOptions = {};

    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    if (search) {
      matchStage["$or"] = [];

      if (search) {
        matchStage["$or"].push(
          { "homeTeam.team.name": { $regex: search, $options: "i" } },
          { "awayTeam.team.name": { $regex: search, $options: "i" } },
          { "homeTeam.team.country": { $regex: search, $options: "i" } },
          { "awayTeam.team.country": { $regex: search, $options: "i" } }
        );
      }
    }

    const basePipeline = [
      {
        $lookup: {
          from: "clubteams",
          localField: "homeTeam.team",
          foreignField: "_id",
          as: "clubHomeTeam",
        },
      },
      {
        $lookup: {
          from: "nationalteams",
          localField: "homeTeam.team",
          foreignField: "_id",
          as: "nationalHomeTeam",
        },
      },
      {
        $addFields: {
          "homeTeam.team": {
            $cond: [
              { $eq: ["$type", "ClubTeam"] },
              { $arrayElemAt: ["$clubHomeTeam", 0] },
              { $arrayElemAt: ["$nationalHomeTeam", 0] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "clubteams",
          localField: "awayTeam.team",
          foreignField: "_id",
          as: "clubAwayTeam",
        },
      },
      {
        $lookup: {
          from: "nationalteams",
          localField: "awayTeam.team",
          foreignField: "_id",
          as: "nationalAwayTeam",
        },
      },
      {
        $addFields: {
          "awayTeam.team": {
            $cond: [
              { $eq: ["$type", "ClubTeam"] },
              { $arrayElemAt: ["$clubAwayTeam", 0] },
              { $arrayElemAt: ["$nationalAwayTeam", 0] },
            ],
          },
        },
      },
      { $unwind: { path: "$homeTeam.team", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$awayTeam.team", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "players",
          let: { homeTeamId: "$homeTeam.team._id", type: "$type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $cond: [
                    { $eq: ["$$type", "ClubTeam"] },
                    { $eq: ["$currentClub.club", "$$homeTeamId"] },
                    { $eq: ["$nationalTeams[0]._id", "$$homeTeamId"] },
                  ],
                },
              },
            },
            {
              $project: {
                totalRating: { $sum: "$ratingHistory.newRating" },
              },
            },
          ],
          as: "homeTeamPlayers",
        },
      },
      {
        $lookup: {
          from: "players",
          let: { awayTeamId: "$awayTeam.team._id", type: "$type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $cond: [
                    { $eq: ["$$type", "ClubTeam"] },
                    { $eq: ["$currentClub.club", "$$awayTeamId"] },
                    { $eq: ["$nationalTeams[0]._id", "$$awayTeamId"] },
                  ],
                },
              },
            },
            {
              $project: {
                totalRating: { $sum: "$ratingHistory.newRating" },
              },
            },
          ],
          as: "awayTeamPlayers",
        },
      },
      {
        $addFields: {
          "homeTeam.rating": {
            $sum: "$homeTeamPlayers.totalRating",
          },
          "awayTeam.rating": {
            $sum: "$awayTeamPlayers.totalRating",
          },
        },
      },
      {
        $addFields: {
          ratingDiff: {
            $subtract: ["$homeTeam.rating", "$awayTeam.rating"],
          },
        },
      },
      {
        $sort: sortOptions,
      },
      {
        $project: {
          type: 1,
          date: 1,
          hour: 1,
          league: 1,
          venue: 1,
          homeTeam: 1,
          awayTeam: 1,
          homeTeamPlayers: 1,
          awayTeamPlayers: 1,
          ratingDiff: 1,
        },
      },
    ];

    const aggregatePipeline = [
      ...basePipeline,
      { $match: matchStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const fixtures = await Fixture.aggregate(aggregatePipeline);

    const totalFixturesPipeline = [
      ...basePipeline,
      { $match: matchStage },
      { $count: "total" },
    ];
    const totalFixtures = await Fixture.aggregate(totalFixturesPipeline);
    const total = totalFixtures[0]?.total || 0;

    const totalPages = Math.ceil(total / limit);

    res.json({
      fixtures,
      currentPage: page,
      totalPages,
      total,
      pageSize: limit,
    });
  } catch (error) {
    console.error("Error in GET /fixtures:", error);
    res.status(500).json({
      message: "Error retrieving fixtures",
      error: error.message,
    });
  }
});

router.post("/add-fixture", async (req, res) => {
  try {
    if (
      !req.body.type ||
      !["ClubTeam", "NationalTeam"].includes(req.body.type)
    ) {
      return res.status(400).json({
        message: "Invalid match type",
        error: "INVALID_TYPE",
      });
    }

    if (req.body.homeTeam.team === req.body.awayTeam.team) {
      return res.status(400).json({
        message: "Home team and away team cannot be the same",
        error: "SAME_TEAM",
      });
    }

    const data = req.body;

    const newFixture = await Fixture.create({
      type: data.type,
      date: data.date,
      hour: data.hour,
      league: data.league,
      venue: data.venue,
      awayTeam: {
        team: data.awayTeam.team,
      },
      homeTeam: {
        team: data.homeTeam.team,
      },
    });

    return res.status(201).json({
      message: "Fixture Successfully Added",
      fixture: newFixture,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Failed to create match",
      error: error.message,
    });
  }
});

router.delete("/delete-fixture", async (req, res) => {
  try {
    const fixtureId = req.query.fixtureId;

    if (!fixtureId) {
      return res.status(400).json({
        message: "Fixture Id not found",
      });
    }

    const fixture = await Fixture.findByIdAndDelete(fixtureId);

    if (!fixture) {
      return res.status(404).json({
        message: "Fixture Not found",
      });
    }

    return res.status(200).json({
      message: "Fixture Successfully Deleted",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Failed to create match",
      error: error.message,
    });
  }
});

module.exports = router;
