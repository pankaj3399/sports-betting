const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const Player = require("../models/Player");
const ClubTeam = require("../models/ClubTeam");
const NationalTeam = require("../models/NationalTeams");
// Helper functions for rating calculations
const calculateExpectedPoints = (odds) => {
  const winProb = odds.homeWin;
  const drawProb = odds.draw;
  const loseProb = odds.awayWin;

  return winProb * 3 + drawProb * 1 + loseProb * 0;
};

const getMatchPoints = (goalsFor, goalsAgainst) => {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
};
async function populateMatchData(query, shouldLean = false) {
  const populatedQuery = query
    .populate({
      path: "homeTeam.team",
      select: "name country type",
      refPath: "type",
    })
    .populate({
      path: "awayTeam.team",
      select: "name country type",
      refPath: "type",
    })
    .populate("homeTeam.players.player", "name position")
    .populate("awayTeam.players.player", "name position");

  return shouldLean ? populatedQuery.lean() : populatedQuery;
}

// Get all matches with pagination and search
router.get("/matches", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchTerm = req.query.search || "";

    const query = {};
    if (searchTerm) {
      query["$or"] = [{ venue: { $regex: searchTerm, $options: "i" } }];
    }

    const total = await Match.countDocuments(query);

    if (total === 0) {
      return res.json({
        matches: [],
        currentPage: 1,
        totalPages: 0,
        total: 0,
        message: searchTerm
          ? `No matches found matching "${searchTerm}"`
          : "No matches found",
      });
    }

    const totalPages = Math.ceil(total / limit);
    const validPage = Math.min(Math.max(1, page), totalPages);

    // Get matches and populate references using the helper function with lean
    const matches = await populateMatchData(
      Match.find(query)
        .sort({ date: -1 })
        .skip((validPage - 1) * limit)
        .limit(limit),
      true // Set lean to true
    );

    // Transform the matches to include formatted team names
    const transformedMatches = matches.map((match) => ({
      ...match,
      homeTeam: {
        ...match.homeTeam,
        teamName:
          match.type === "ClubTeam"
            ? match.homeTeam.team?.name
            : match.homeTeam.team
            ? `${match.homeTeam.team.country} ${match.homeTeam.team.type}`
            : "Unknown Team",
      },
      awayTeam: {
        ...match.awayTeam,
        teamName:
          match.type === "ClubTeam"
            ? match.awayTeam.team?.name
            : match.awayTeam.team
            ? `${match.awayTeam.team.country} ${match.awayTeam.team.type}`
            : "Unknown Team",
      },
    }));

    res.json({
      matches: transformedMatches,
      currentPage: validPage,
      totalPages,
      total,
      pageSize: limit,
    });
  } catch (error) {
    console.error("Error in GET /matches:", error);
    res.status(500).json({
      message: "Error retrieving matches",
      error: error.message,
    });
  }
});

// Get single match route
router.get("/matches/:id", async (req, res) => {
  try {
    // Use populateMatchData without lean for single match
    const match = await populateMatchData(Match.findById(req.params.id));

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const matchObj = match.toObject();

    const transformedMatch = {
      ...matchObj,
      homeTeam: {
        ...matchObj.homeTeam,
        teamName:
          match.type === "ClubTeam"
            ? matchObj.homeTeam.team?.name
            : `${matchObj.homeTeam.team?.country} ${matchObj.homeTeam.team?.type}`,
      },
      awayTeam: {
        ...matchObj.awayTeam,
        teamName:
          match.type === "ClubTeam"
            ? matchObj.awayTeam.team?.name
            : `${matchObj.awayTeam.team?.country} ${matchObj.awayTeam.team?.type}`,
      },
    };

    res.json(transformedMatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//update the match with id
router.put("/edit-match/:matchId", async (req, res) => {
  try {
    // 1. Fetch and Validate Match ID
    const { matchId } = req.params;
    const existingMatch = await Match.findById(matchId);
    if (!existingMatch) {
      return res.status(404).json({
        message: "Match not found",
        error: "MATCH_NOT_FOUND",
      });
    }

    // 2. Date Validation
    const matchDate = new Date(req.body.date);
    if (matchDate > new Date()) {
      return res.status(400).json({
        message: "Match date must be in the past",
        error: "INVALID_DATE",
      });
    }

    // 3. Type Validation
    if (
      req.body.type &&
      !["ClubTeam", "NationalTeam"].includes(req.body.type)
    ) {
      return res.status(400).json({
        message: "Invalid match type",
        error: "INVALID_TYPE",
      });
    }

    // 4. Odds Validation
    if (req.body.odds) {
      const odds = req.body.odds;
      const totalOdds =
        Number(odds.homeWin) + Number(odds.draw) + Number(odds.awayWin);
      if (totalOdds < 0.9 || totalOdds > 1.1) {
        return res.status(400).json({
          message: "Match odds probabilities should roughly sum to 1",
          error: "INVALID_ODDS",
        });
      }
    }

    // 5. Validate Teams
    if (req.body.homeTeam?.team === req.body.awayTeam?.team) {
      return res.status(400).json({
        message: "Home team and away team cannot be the same",
        error: "SAME_TEAM",
      });
    }

    // 6. Prepare Updated Match Data
    const updatedMatchData = {
      ...req.body,
      date: matchDate,
      rating: {
        homeTeamRating: req.body.rating.homeTeamRating,
        awayTeamRating: req.body.rating.awayTeamRating,
      },
      "homeTeam.ratingChange": calculateRatingChange(
        getMatchPoints(req.body.homeTeam.score, req.body.awayTeam.score),
        calculateExpectedPoints(req.body.odds)
      ),
      "awayTeam.ratingChange": calculateRatingChange(
        getMatchPoints(req.body.awayTeam.score, req.body.homeTeam.score),
        calculateExpectedPoints({
          homeWin: req.body.odds.awayWin,
          draw: req.body.odds.draw,
          awayWin: req.body.odds.homeWin,
        })
      ),
    };

    const getDeselectedPlayers = (isHome) => {
      let deselectedPlayers = [];
      let newPlayerIds;

      if (isHome) {
        newPlayerIds = new Set(req.body.homeTeam.players.map((p) => p._id));
        deselectedPlayers = existingMatch.homeTeam.players.filter(
          (p) => !newPlayerIds.has(p._id)
        );
      } else {
        newPlayerIds = new Set(req.body.awayTeam.players.map((p) => p._id));
        deselectedPlayers = existingMatch.awayTeam.players.filter(
          (p) => !newPlayerIds.has(p._id)
        );
      }

      return deselectedPlayers;
    };

    const removeDeselectedPlayerRatings = async (players, matchId) => {
      return Promise.all(
        players.map(async (playerId) => {
          return Player.findByIdAndUpdate(
            playerId,
            {
              $pull: {
                ratingHistory: { matchId: matchId },
              },
            },
            {
              new: true,
              runValidators: true,
            }
          );
        })
      );
    };

    const updatePlayerRatings = async (players, ratingChange) => {
      return Promise.all(
        players.map(async ({ player: playerId }) => {
          const ratingHistoryEntry = {
            date: matchDate,
            newRating: ratingChange,
            type: "match",
            matchId: matchId,
          };

          return Player.findByIdAndUpdate(
            playerId,
            {
              $push: { ratingHistory: ratingHistoryEntry },
            },
            {
              new: true,
              runValidators: true,
            }
          );
        })
      );
    };

    const homeTeamDeselectedPlayers = getDeselectedPlayers(true);
    const awayTeamDeselectedPlayers = getDeselectedPlayers(false);

    await Promise.all([
      removeDeselectedPlayerRatings(homeTeamDeselectedPlayers, matchId),
      removeDeselectedPlayerRatings(awayTeamDeselectedPlayers, matchId),
      updatePlayerRatings(
        req.body.homeTeam.players.filter((p) => p.starter),
        req.body.rating.homeTeamRating
      ),
      updatePlayerRatings(
        req.body.awayTeam.players.filter((p) => p.starter),
        req.body.rating.awayTeamRating
      ),
    ]);

    // 7. Update Match in Database
    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      { $set: updatedMatchData },
      { new: true, runValidators: true }
    )
      .populate({
        path: "homeTeam.team",
        select: "name country type",
        refPath: "type",
      })
      .populate({
        path: "awayTeam.team",
        select: "name country type",
        refPath: "type",
      })
      .populate("homeTeam.players.player", "name position")
      .populate("awayTeam.players.player", "name position");

    // 8. Transform Response
    const transformedMatch = {
      ...updatedMatch.toObject(),
      homeTeam: {
        ...updatedMatch.homeTeam,
        teamName:
          updatedMatch.type === "ClubTeam"
            ? updatedMatch.homeTeam.team?.name
            : `${updatedMatch.homeTeam.team?.country} ${updatedMatch.homeTeam.team?.type}`,
      },
      awayTeam: {
        ...updatedMatch.awayTeam,
        teamName:
          updatedMatch.type === "ClubTeam"
            ? updatedMatch.awayTeam.team?.name
            : `${updatedMatch.awayTeam.team?.country} ${updatedMatch.awayTeam.team?.type}`,
      },
    };

    // 9. Send Response
    return res.status(200).json({ match: transformedMatch });
  } catch (error) {
    console.error("Error updating match:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: "INTERNAL_ERROR" });
  }
});

// Create a new match
const calculateRatingChange = (actualPoints, expectedPoints) => {
  return Number((actualPoints - expectedPoints).toFixed(2));
};

// POST route with simplified rating storage
router.post("/matches", async (req, res) => {
  try {
    // 1. Date Validation
    const matchDate = new Date(req.body.date);
    if (matchDate > new Date()) {
      return res.status(400).json({
        message: "Match date must be in the past",
        error: "INVALID_DATE",
      });
    }

    // 2. Type Validation
    if (
      !req.body.type ||
      !["ClubTeam", "NationalTeam"].includes(req.body.type)
    ) {
      return res.status(400).json({
        message: "Invalid match type",
        error: "INVALID_TYPE",
      });
    }

    // 3. Odds Validation
    const odds = req.body.odds;
    const totalOdds =
      Number(odds.homeWin) + Number(odds.draw) + Number(odds.awayWin);
    if (totalOdds < 0.9 || totalOdds > 1.1) {
      return res.status(400).json({
        message: "Match odds probabilities should roughly sum to 1",
        error: "INVALID_ODDS",
      });
    }

    // 4. Check for same-day matches
    const dateOnly = matchDate.toISOString().split("T")[0];
    const startOfDay = new Date(dateOnly);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existingMatch = await Match.findOne({
      type: req.body.type,
      date: { $gte: startOfDay, $lte: endOfDay },
      $or: [
        { "homeTeam.team": req.body.homeTeam.team },
        { "awayTeam.team": req.body.homeTeam.team },
        { "homeTeam.team": req.body.awayTeam.team },
        { "awayTeam.team": req.body.awayTeam.team },
      ],
    });

    if (existingMatch) {
      // Determine which team has the conflict
      const conflictingTeamId =
        existingMatch.homeTeam.team.toString() === req.body.homeTeam.team ||
        existingMatch.awayTeam.team.toString() === req.body.homeTeam.team
          ? req.body.homeTeam.team
          : req.body.awayTeam.team;

      let teamName;
      if (req.body.type === "ClubTeam") {
        const club = await ClubTeam.findById(conflictingTeamId);
        teamName = club?.name || "Unknown Team";
      } else {
        const nationalTeam = await NationalTeam.findById(conflictingTeamId);
        teamName = nationalTeam
          ? `${nationalTeam.country} ${nationalTeam.type}`
          : "Unknown Team";
      }

      return res.status(409).json({
        message: `${teamName} already has a match scheduled on ${dateOnly}`,
        error: "TEAM_UNAVAILABLE",
      });
    }

    // 5. Validate Teams
    if (req.body.homeTeam.team === req.body.awayTeam.team) {
      return res.status(400).json({
        message: "Home team and away team cannot be the same",
        error: "SAME_TEAM",
      });
    }

    // 7. Calculate Rating Changes
    const homeExpectedPoints = calculateExpectedPoints(req.body.odds);
    const awayExpectedPoints = calculateExpectedPoints({
      homeWin: req.body.odds.awayWin,
      draw: req.body.odds.draw,
      awayWin: req.body.odds.homeWin,
    });

    const homeActualPoints = getMatchPoints(
      req.body.homeTeam.score,
      req.body.awayTeam.score
    );
    const awayActualPoints = getMatchPoints(
      req.body.awayTeam.score,
      req.body.homeTeam.score
    );

    const homeRatingChange = calculateRatingChange(
      homeActualPoints,
      homeExpectedPoints
    );
    const awayRatingChange = calculateRatingChange(
      awayActualPoints,
      awayExpectedPoints
    );

    // 8. Prepare Match Data
    const matchData = {
      type: req.body.type,
      date: matchDate,
      rating: {
        homeTeamRating: req.body.rating.homeTeamRating,
        awayTeamRating: req.body.rating.awayTeamRating,
      },
      venue: req.body.venue.trim(),
      homeTeam: {
        team: req.body.homeTeam.team,
        score: req.body.homeTeam.score,
        players: req.body.homeTeam.players,
        ratingChange: homeRatingChange,
      },
      awayTeam: {
        team: req.body.awayTeam.team,
        score: req.body.awayTeam.score,
        players: req.body.awayTeam.players,
        ratingChange: awayRatingChange,
      },
      odds: {
        homeWin: req.body.odds.homeWin,
        draw: req.body.odds.draw,
        awayWin: req.body.odds.awayWin,
      },
    };

    // 9. Save Match
    const match = new Match(matchData);
    const savedMatch = await match.save();

    // 10. Update Player Ratings
    const updatePlayerRatings = async (players, ratingChange) => {
      return Promise.all(
        players.map(async ({ player: playerId }) => {
          const ratingHistoryEntry = {
            date: matchDate,
            newRating: ratingChange,
            type: "match",
            matchId: savedMatch._id,
          };

          return Player.findByIdAndUpdate(
            playerId,
            {
              $push: { ratingHistory: ratingHistoryEntry },
            },
            {
              new: true,
              runValidators: true,
            }
          );
        })
      );
    };

    await Promise.all([
      updatePlayerRatings(
        req.body.homeTeam.players.filter((p) => p.starter),
        homeRatingChange
      ),
      updatePlayerRatings(
        req.body.awayTeam.players.filter((p) => p.starter),
        awayRatingChange
      ),
    ]);

    // 11. Fetch Populated Match
    const populatedMatch = await Match.findById(savedMatch._id)
      .populate({
        path: "homeTeam.team",
        select: "name country type",
        refPath: "type",
      })
      .populate({
        path: "awayTeam.team",
        select: "name country type",
        refPath: "type",
      })
      .populate("homeTeam.players.player", "name position")
      .populate("awayTeam.players.player", "name position");

    // 12. Transform Response
    const transformedMatch = {
      ...populatedMatch.toObject(),
      homeTeam: {
        ...populatedMatch.homeTeam,
        teamName:
          req.body.type === "ClubTeam"
            ? populatedMatch.homeTeam.team?.name
            : `${populatedMatch.homeTeam.team?.country} ${populatedMatch.homeTeam.team?.type}`,
      },
      awayTeam: {
        ...populatedMatch.awayTeam,
        teamName:
          req.body.type === "ClubTeam"
            ? populatedMatch.awayTeam.team?.name
            : `${populatedMatch.awayTeam.team?.country} ${populatedMatch.awayTeam.team?.type}`,
      },
    };

    // 13. Send Response
    res.status(201).json({
      match: transformedMatch,
      ratingChanges: {
        home: homeRatingChange,
        away: awayRatingChange,
      },
    });
  } catch (error) {
    console.error("Error details:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        details: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate match entry",
        error: "DUPLICATE_MATCH",
      });
    }

    res.status(500).json({
      message: "Failed to create match",
      error: error.message,
    });
  }
});

router.get("/get-all-matches", async (req, res) => {
  try {
    const teamId = req.query.teamId;

    if (!teamId) {
      return res.status(400).json({
        message: "Team name not passed!",
      });
    }

    const matches = await Match.find({
      $or: [
        { "homeTeam.team": teamId },
        { "awayTeam.team": teamId }],
    });

    return res.status(200).json({
      matches,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error!",
    });
  }
});

router.get("/check-team-availability", async (req, res) => {
  try {
    const { teamId, date, type } = req.query;

    // Validate required parameters
    if (!teamId || !date || !type) {
      return res.status(400).json({
        message:
          "Missing required parameters. Team ID, date, and type are required.",
      });
    }

    // Validate date format
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Please use YYYY-MM-DD format.",
      });
    }

    const startOfDay = new Date(checkDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(checkDate.setHours(23, 59, 59, 999));

    // Validate type
    if (!["ClubTeam", "NationalTeam"].includes(type)) {
      return res.status(400).json({
        message: "Invalid team type. Must be either ClubTeam or NationalTeam.",
      });
    }

    let teamName;
    let existingMatch;

    if (type === "ClubTeam") {
      const club = await ClubTeam.findById(teamId);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      teamName = club.name;

      existingMatch = await Match.findOne({
        type: "ClubTeam",
        date: { $gte: startOfDay, $lte: endOfDay },
        $or: [{ "homeTeam.team": teamId }, { "awayTeam.team": teamId }],
      });
    } else {
      const nationalTeam = await NationalTeam.findById(teamId);
      if (!nationalTeam) {
        return res.status(404).json({ message: "National team not found" });
      }
      teamName = `${nationalTeam.country} ${nationalTeam.type}`;

      existingMatch = await Match.findOne({
        type: "NationalTeam",
        date: { $gte: startOfDay, $lte: endOfDay },
        $or: [{ "homeTeam.team": teamId }, { "awayTeam.team": teamId }],
      });
    }

    return res.status(200).json({
      hasMatch: !!existingMatch,
      teamName,
      existingMatchDetails: existingMatch
        ? {
            venue: existingMatch.venue,
            date: existingMatch.date,
            isHomeTeam: existingMatch.homeTeam.team.toString() === teamId,
          }
        : null,
    });
  } catch (error) {
    console.error("Error checking team availability:", error);
    return res.status(500).json({
      message: "Error checking team availability",
      error: error.message,
    });
  }
});

module.exports = router;
