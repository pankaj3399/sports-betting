const Player = require('../models/Player');

module.exports = {
  async create(req, res) {
    const {
      name,
      dateOfBirth,
      position,
      currentClub,
      country,
      nationalTeams,
      previousClubs,
      rating,
    } = req.body;

    if (!name || !dateOfBirth || !position || !country) {
      return res.status(400).json({
        success: false,
        msg: 'Name, date of birth, position, and country are required',
      });
    }

    try {
      const validDate = new Date(dateOfBirth);
      if (isNaN(validDate.getTime())) {
        return res.status(400).json({
          success: false,
          msg: 'Invalid date format for date of birth',
        });
      }

      const normalizedName = name.trim();
      const existingPlayer = await Player.findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
        dateOfBirth: new Date(dateOfBirth),
      });

      if (existingPlayer) {
        return res.status(400).json({
          success: false,
          msg: 'A player with the same name and date of birth already exists',
        });
      }

      const initialRatingHistory = [];
      if (rating !== undefined && !isNaN(Number(rating))) {
        initialRatingHistory.push({
          date: new Date(),
          newRating: Number(rating),
          type: 'manual',
        });
      }

      const player = await Player.create({
        name: normalizedName,
        dateOfBirth: new Date(dateOfBirth),
        position,
        currentClub,
        country,
        nationalTeams: nationalTeams?.map((team) => ({
          ...team,
          from: new Date(team.from),
          to: team.currentlyPlaying ? null : new Date(team.to),
        })),
        previousClubs: previousClubs?.map((club) => ({
          ...club,
          from: new Date(club.from),
          to: new Date(club.to),
        })),
        ratingHistory: initialRatingHistory,
      });

      return res.status(201).json({ success: true, data: player });
    } catch (error) {
      console.error('Error creating player:', error);
      return res
        .status(500)
        .json({
          success: false,
          msg: 'Error creating player',
          error: error.message,
        });
    }
  },

  // The 'checkDuplicate' function has no changes.
  async checkDuplicate(req, res) {
    const { name, dateOfBirth } = req.query;

    if (!name || !dateOfBirth) {
      return res
        .status(400)
        .json({ success: false, msg: 'Name and date of birth are required' });
    }

    try {
      const validDate = new Date(dateOfBirth);
      if (isNaN(validDate.getTime())) {
        return res
          .status(400)
          .json({ success: false, msg: 'Invalid date format' });
      }

      const existingPlayer = await Player.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        dateOfBirth: new Date(dateOfBirth),
      });

      return res.json({ success: true, exists: !!existingPlayer });
    } catch (error) {
      console.error('Error checking for duplicate:', error);
      return res
        .status(500)
        .json({
          success: false,
          msg: 'Error checking for duplicate player',
          error: error.message,
        });
    }
  },

  // The 'updatePlayer' function is correct from the previous fix and should remain.
  async updatePlayer(req, res) {
    try {
      const playerId = req.params.id;
      const { rating, matchDate, ...otherData } = req.body;

      let updateData = {
        ...otherData,
        dateOfBirth: new Date(otherData.dateOfBirth),
        nationalTeams: otherData.nationalTeams?.map((team) => ({
          ...team,
          from: new Date(team.from),
          to: team.currentlyPlaying ? null : team.to ? new Date(team.to) : null,
        })),
      };

      if (rating !== undefined && matchDate) {
        updateData.$push = {
          ratingHistory: {
            date: new Date(matchDate),
            newRating: Number(rating),
          },
        };
      }

      const player = await Player.findByIdAndUpdate(playerId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate('position')
        .populate('country')
        .populate('currentClub.club');

      if (!player) {
        return res
          .status(404)
          .json({ success: false, message: 'Player not found' });
      }

      return res.json({ success: true, data: player });
    } catch (error) {
      console.error('Update error details:', {
        name: error.name,
        message: error.message,
      });
      return res
        .status(500)
        .json({
          success: false,
          message: 'Error updating player',
          error: error.message,
          errorType: error.name,
        });
    }
  },

  async fetchAllPlayers(req, res) {
    try {
      const {
        page = 1,
        perPage = 10,
        search = '',
        sortBy = 'name',
        sortOrder = 'asc',
        filter,
        ageGroup = null,
        position = null,
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(perPage, 10);

      let sortField = sortBy;
      if (sortBy === 'club') {
        sortField = 'clubDetails.name';
      }

      const sortOptions = {};
      sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

      const matchConditions = { name: { $regex: search, $options: 'i' } };

      if (filter === 'true') {
        const ageGroupMap = {
          under20: { $lt: 20 },
          under22: { $lt: 22 },
          under26: { $lt: 26 },
          under30: { $lt: 30 },
        };
        if (ageGroup && ageGroupMap[ageGroup])
          matchConditions.age = ageGroupMap[ageGroup];
        if (position)
          matchConditions['positionDetails.position'] =
            decodeURIComponent(position);
      }

      //-- FINAL FIX: This pipeline now handles all data structures without requiring data deletion. --//
      const pipeline = [
        // STEP 1: Create a truly unified history field that accounts for all legacy data structures.
        {
          $addFields: {
            unifiedRatingHistory: {
              $let: {
                vars: {
                  // Use $ifNull to safely access potentially missing fields.
                  newHistory: { $ifNull: ['$ratingHistory', []] },
                  oldHistory: { $ifNull: ['$ratings', []] },
                  legacyRating: { $ifNull: ['$rating', null] },
                },
                in: {
                  $switch: {
                    branches: [
                      // Case 1: The new `ratingHistory` array has data. This is top priority.
                      {
                        case: { $gt: [{ $size: '$$newHistory' }, 0] },
                        then: '$$newHistory',
                      },
                      // Case 2: The old `ratings` array has data. Use it and transform it.
                      {
                        case: { $gt: [{ $size: '$$oldHistory' }, 0] },
                        then: {
                          $map: {
                            input: '$$oldHistory',
                            as: 'r',
                            in: { date: '$$r.date', newRating: '$$r.rating' },
                          },
                        },
                      },
                      // Case 3: Both arrays are empty, but the top-level `rating` field exists.
                      {
                        case: { $ne: ['$$legacyRating', null] },
                        then: [
                          // Create a history array on the fly from this legacy field.
                          { date: '$dateOfBirth', newRating: '$$legacyRating' },
                        ],
                      },
                    ],
                    // Default Case: If none of the above are true, return an empty array.
                    default: [],
                  },
                },
              },
            },
          },
        },
        // The rest of the pipeline remains the same and now uses the 100% reliable `unifiedRatingHistory`.
        {
          $addFields: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$dateOfBirth'] },
                  365 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        {
          $addFields: {
            rating: {
              $reduce: {
                input: '$unifiedRatingHistory',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.newRating'] },
              },
            },
            netRating: {
              $sum: {
                $map: {
                  input: '$unifiedRatingHistory',
                  as: 'rating',
                  in: {
                    $let: {
                      vars: {
                        daysDiff: {
                          $floor: {
                            $divide: [
                              { $subtract: [new Date(), '$$rating.date'] },
                              1000 * 60 * 60 * 24,
                            ],
                          },
                        },
                      },
                      in: {
                        $cond: [
                          { $lt: ['$$daysDiff', 0] },
                          0,
                          {
                            $cond: [
                              { $gte: ['$$daysDiff', 1461] },
                              0,
                              {
                                $multiply: [
                                  '$$rating.newRating',
                                  {
                                    $divide: [
                                      { $subtract: [1461, '$$daysDiff'] },
                                      1461,
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'clubteams',
            localField: 'currentClub.club',
            foreignField: '_id',
            as: 'clubDetails',
          },
        },
        { $unwind: { path: '$clubDetails', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'countries',
            localField: 'country',
            foreignField: '_id',
            as: 'countryDetails',
          },
        },
        {
          $unwind: {
            path: '$countryDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'positions',
            localField: 'position',
            foreignField: '_id',
            as: 'positionDetails',
          },
        },
        {
          $unwind: {
            path: '$positionDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: matchConditions },
        { $sort: sortOptions },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
      ];

      const totalPipeline = [
        {
          $addFields: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$dateOfBirth'] },
                  365 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'positions',
            localField: 'position',
            foreignField: '_id',
            as: 'positionDetails',
          },
        },
        {
          $unwind: {
            path: '$positionDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: matchConditions },
        { $count: 'total' },
      ];

      const [players, totalPlayers] = await Promise.all([
        Player.aggregate(pipeline),
        Player.aggregate(totalPipeline),
      ]);

      const total = totalPlayers[0]?.total || 0;

      return res
        .status(200)
        .json({ players, total, page: pageNum, perPage: limitNum });
    } catch (error) {
      console.error('Detailed error in fetchAllPlayers:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      res
        .status(500)
        .json({
          success: false,
          message: 'Error fetching players',
          error: error.message,
          errorType: error.name,
        });
    }
  },
};
