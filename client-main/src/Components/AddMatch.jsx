import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Card, CardContent } from "../Components/ui/card";
import Select from "react-select";
import { useToast } from "@/hooks/use-toast";
import { getActiveClubs } from "../api/Clubs";
import { getCountries, getNationalTeams } from "../api/Country";
import { RadioGroup, RadioGroupItem } from "../Components/ui/radio-group";
import { Label } from "../Components/ui/label";
// Badge component
const Badge = ({ children, variant = "default", className = "" }) => {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variantStyles = {
    default: "bg-gray-100 text-gray-900",
    primary: "bg-blue-100 text-blue-900",
    secondary: "bg-gray-100 text-gray-900",
    destructive: "bg-red-100 text-red-900",
    success: "bg-green-100 text-green-900",
    warning: "bg-yellow-100 text-yellow-900",
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;
  return <div className={combinedClassName}>{children}</div>;
};

// Helper functions
export const calculateExpectedPoints = (odds) => {
  const winProb = parseFloat(odds.homeWin) || 0;
  const drawProb = parseFloat(odds.draw) || 0;
  const loseProb = parseFloat(odds.awayWin) || 0;
  return winProb * 3 + drawProb * 1 + loseProb * 0;
};

export const getMatchPoints = (goalsFor, goalsAgainst) => {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
};

export const calculateRatingChange = (actualPoints, expectedPoints) => {
  return Number((actualPoints - expectedPoints).toFixed(4));
};

// PlayerList component
export const PlayerList = ({
  players,
  isHome,
  handlePlayerSelection,
  selectedPlayers,
  playerCount,
}) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-medium">Select Players</h4>
      <Badge
        variant={playerCount === 11 ? "success" : "secondary"}
        className="ml-2"
      >
        {playerCount} Selected
      </Badge>
    </div>
    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
      {players.map((player) => (
        <div
          key={player._id}
          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-md"
        >
          <input
            type="checkbox"
            checked={selectedPlayers.some(
              (p) => p.player._id === player._id && p.starter
            )}
            onChange={(e) =>
              handlePlayerSelection(player, e.target.checked, isHome)
            }
            className="w-4 h-4"
          />
          <span>{player.name}</span>
        </div>
      ))}
    </div>
  </div>
);
export const TeamSelector = ({
  isHome,
  matchType,
  selectedTeam,
  onTeamChange,
  clubsData,
  countriesData,
  selectedCountry,
  setSelectedCountry,
  nationalTeams,
  setNationalTeams,
}) => {
  useEffect(() => {
    const fetchNationalTeams = async () => {
      if (selectedCountry?.value) {
        try {
          const teams = await getNationalTeams(selectedCountry.value);          
          setNationalTeams(teams);
        } catch (error) {
          console.error("Error fetching national teams:", error);
        }
      }
    };

    if (matchType === "NationalTeam" && selectedCountry) {
      fetchNationalTeams();
    }
  }, [selectedCountry, matchType, setNationalTeams]);

  if (matchType === "ClubTeam") {
    return (
      <Select
        value={selectedTeam}
        onChange={onTeamChange}
        options={
          clubsData?.map((club) => ({
            label: club.name,
            value: club._id,
          })) || []
        }
        placeholder={`Select ${isHome ? "Home" : "Away"} Team`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Select
        value={selectedCountry}
        onChange={(selected) => {
          setSelectedCountry(selected);
          onTeamChange(null);
        }}
        options={
          countriesData?.map((country) => ({
            label: typeof country === "string" ? country : country.country,
            value: typeof country === "string" ? country : country.country,
          })) || []
        }
        placeholder="Select Country"
      />
      {selectedCountry && (
        <Select
          value={selectedTeam}
          onChange={onTeamChange}
          options={
            nationalTeams?.map((team) => ({
              label: `${team.country} ${team.type}`,
              value: team._id,
            })) || []
          }
          placeholder="Select National Team"
        />
      )}
    </div>
  );
};

const AddMatch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [homeNationalTeams, setHomeNationalTeams] = useState([]);
  const [awayNationalTeams, setAwayNationalTeams] = useState([]);
  const [homeTeamRating, setHomeTeamRating] = useState(0);
  const [awayTeamRating, setAwayTeamRating] = useState(0);
  const [playerCounts, setPlayerCounts] = useState({
    home: 0,
    away: 0,
  });
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const params = Object.fromEntries(queryParams);
  const [matchType, setMatchType] = useState(params.matchType ?? "ClubTeam");
  const [selectedHomeCountry, setSelectedHomeCountry] = useState(
    matchType === "NationalTeam" ? { value: params.homeCountry, label: params.homeCountry } : null
  );
  const [selectedAwayCountry, setSelectedAwayCountry] = useState(
    matchType === "NationalTeam" ? { value: params.awayCountry, label: params.awayCountry } : null
  );

  const [matchData, setMatchData] = useState({
    type: params.matchType ?? "ClubTeam",
    date: params.date ?? "",
    venue: params.venue ?? "",
    league : params.league ?? "",
    rating: {
      homeTeamRating: 0,
      awayTeamRating: 0,
    },
    homeTeam: {
      team: params.homeTeam ?? "",
      score: "",
      players: [],
    },
    awayTeam: {
      team: params.awayTeam ?? "",
      score: "",
      players: [],
    },
    odds: {
      homeWin: "",
      draw: "",
      awayWin: "",
    },
  });

  const { data: clubsData } = useQuery({
    queryKey: ["clubs"],
    queryFn: getActiveClubs,
    enabled: matchType === "ClubTeam",
  });

  const { data: countriesData } = useQuery({
    queryKey: ["countries"],
    queryFn: getCountries,
    enabled: matchType === "NationalTeam",
    select: (data) =>
      data.map((country) =>
        typeof country === "string" ? country : country.country
      ),
  });

  const handleTeamChange = (selected, isHome) => {
    const teamKey = isHome ? "homeTeam" : "awayTeam";
    setMatchData((prev) => ({
      ...prev,
      [teamKey]: {
        team: selected?.value || "", // Changed from club to team
        score: "",
        players: [], // Reset players when team changes
      },
    }));

    // Reset the corresponding player count
    setPlayerCounts((prev) => ({
      ...prev,
      [isHome ? "home" : "away"]: 0,
    }));
  };

  const handlePlayerSelection = useCallback((player, isStarter, isHome) => {
    const teamKey = isHome ? "homeTeam" : "awayTeam";
    setMatchData((prev) => {
      const currentPlayers = [...prev[teamKey].players];
      const playerIndex = currentPlayers.findIndex(
        (p) => p.player._id === player._id
      );

      let updatedPlayers;
      if (playerIndex === -1 && isStarter) {
        updatedPlayers = [
          ...currentPlayers,
          { player: player, starter: true, _id: player._id },
        ];
      } else if (!isStarter) {
        updatedPlayers = currentPlayers.filter(
          (p) => p.player._id !== player._id
        );
      } else {
        updatedPlayers = currentPlayers.map((p) =>
          p.player._id === player._id
            ? { ...p, starter: true, _id: player._id }
            : p
        );
      }

      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: updatedPlayers,
        },
      };
    });
  }, []);

  // Update player counts
  useEffect(() => {
    const homeStarterCount = matchData.homeTeam.players.filter(
      (p) => p.starter
    ).length;
    const awayStarterCount = matchData.awayTeam.players.filter(
      (p) => p.starter
    ).length;

    setPlayerCounts({
      home: homeStarterCount,
      away: awayStarterCount,
    });
  }, [matchData.homeTeam.players, matchData.awayTeam.players]);

  // Fetch players effect
  // In AddMatch component
  useEffect(() => {
    const fetchPlayers = async (teamId, isHome) => {
      if (!teamId || !matchData.date) return;

      try {
        let players;
        const dateParam = encodeURIComponent(matchData.date);

        if (matchType === "ClubTeam") {
          const response = await fetch(
            `${
              import.meta.env.VITE_REACT_APP_API_URL
            }/api/club/${teamId}/players?date=${dateParam}`
          );
          if (!response.ok) throw new Error("Failed to fetch players");
          players = await response.json();
        } else {
          const response = await fetch(
            `${
              import.meta.env.VITE_REACT_APP_API_URL
            }/api/country/national-teams/${teamId}/players?date=${dateParam}`
          );
          if (!response.ok) throw new Error("Failed to fetch players");
          players = await response.json();
        }

        if (isHome) {
          setHomePlayers(players);
        } else {
          setAwayPlayers(players);
        }
      } catch (error) {
        console.error("Error fetching players:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to fetch ${
            isHome ? "home" : "away"
          } team players`,
        });
      }
    };

    // Only fetch players if we have both a team and a date
    if (matchData.date) {
      if (matchData.homeTeam.team) fetchPlayers(matchData.homeTeam.team, true);
      if (matchData.awayTeam.team) fetchPlayers(matchData.awayTeam.team, false);
    }
  }, [
    matchData.homeTeam.team,
    matchData.awayTeam.team,
    matchData.date,
    matchType,
    toast,
  ]);

  // Rating changes effect
  useEffect(() => {
    const { homeTeam, awayTeam, odds } = matchData;

    if (
      homeTeam.score !== "" &&
      awayTeam.score !== "" &&
      odds.homeWin !== "" &&
      odds.draw !== "" &&
      odds.awayWin !== ""
    ) {
      const homeExpectedPoints = calculateExpectedPoints(odds);
      const awayExpectedPoints = calculateExpectedPoints({
        homeWin: odds.awayWin,
        draw: odds.draw,
        awayWin: odds.homeWin,
      });

      const homeActualPoints = getMatchPoints(
        parseInt(homeTeam.score),
        parseInt(awayTeam.score)
      );
      const awayActualPoints = getMatchPoints(
        parseInt(awayTeam.score),
        parseInt(homeTeam.score)
      );

      const homeRatingChange = calculateRatingChange(
        homeActualPoints,
        homeExpectedPoints
      );
      const awayRatingChange = calculateRatingChange(
        awayActualPoints,
        awayExpectedPoints
      );

      setHomeTeamRating(homeRatingChange);
      setAwayTeamRating(awayRatingChange);

      toast({
        title: "Predicted Rating Changes",
        description: (
          <div className="space-y-1">
            <p>
              Home Team: {homeRatingChange > 0 ? "+" : ""}
              {homeRatingChange}
            </p>
            <p>
              Away Team: {awayRatingChange > 0 ? "+" : ""}
              {awayRatingChange}
            </p>
          </div>
        ),
        duration: 5000,
      });
    }
  }, [
    matchData.homeTeam.score,
    matchData.awayTeam.score,
    matchData.odds.homeWin,
    matchData.odds.draw,
    matchData.odds.awayWin,
    toast,
  ]);

  const addMatchMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(
        `${import.meta.env.VITE_REACT_APP_API_URL}/api/match/matches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create match");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["matches"]);
      queryClient.invalidateQueries(["players"]);
      toast({
        title: "Match Added Successfully",
        description: "Match result saved and player ratings updated",
      });
      navigate("/matches");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add match",
      });
    },
  });

  const checkExistingMatches = async (teamId, date, type) => {
    try {
      // Ensure the date is properly formatted as YYYY-MM-DD
      const formattedDate = new Date(date).toISOString().split("T")[0];

      // Validate inputs before making the request
      if (!teamId || !formattedDate || !type) {
        throw new Error("Missing required parameters");
      }

      // Convert type to match backend expectations

      const queryParams = new URLSearchParams({
        teamId,
        date: formattedDate,
        type,
      });

      const response = await fetch(
        `${
          import.meta.env.VITE_REACT_APP_API_URL
        }/api/match/check-team-availability?${queryParams}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to check team availability"
        );
      }

      const { hasMatch, teamName } = await response.json();
      return { hasMatch, teamName };
    } catch (error) {
      console.error("Error checking team availability:", error);
      throw error;
    }
  };

  const handleMatchTypeChange = (value) => {
    setMatchType(value);
    setMatchData((prev) => ({
      ...prev,
      type: value,
      homeTeam: { team: "", score: "", players: [] },
      awayTeam: { team: "", score: "", players: [] },
    }));
    setSelectedHomeCountry(null);
    setSelectedAwayCountry(null);
    setHomeNationalTeams([]);
    setAwayNationalTeams([]);
    setHomePlayers([]);
    setAwayPlayers([]);
    setPlayerCounts({ home: 0, away: 0 });
  };

  const validateOdds = () => {
    const { homeWin, draw, awayWin } = matchData.odds;
    // Convert strings to numbers and fix to 4 decimal places
    const homeWinNum = Number(Number(homeWin).toFixed(4));
    const drawNum = Number(Number(draw).toFixed(4));
    const awayWinNum = Number(Number(awayWin).toFixed(4));

    // Check if any probability is negative or greater than 1
    if (
      homeWinNum < 0 ||
      drawNum < 0 ||
      awayWinNum < 0 ||
      homeWinNum > 1 ||
      drawNum > 1 ||
      awayWinNum > 1
    ) {
      return false;
    }

    // Calculate total and allow for reasonable margin
    const total = homeWinNum + drawNum + awayWinNum;
    // Allow probabilities to sum between 0.9 and 1.1 (10% margin)
    return total >= 0.9 && total <= 1.1;
  };
  const validatePlayers = () => {
    const homeStarters = matchData.homeTeam.players.filter(
      (p) => p.starter
    ).length;
    const awayStarters = matchData.awayTeam.players.filter(
      (p) => p.starter
    ).length;
    return homeStarters > 0 && awayStarters > 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate odds
    if (!validateOdds()) {
      toast({
        variant: "destructive",
        description:
          "Match odds must be between 0 and 1, and should roughly sum to 1 (±10% margin allowed)",
      });
      return;
    }

    // Validate players
    if (!validatePlayers()) {
      toast({
        variant: "destructive",
        description: "Each team must have atleast 1 starter",
      });
      return;
    }
    try {
      const matchDate = new Date(matchData.date);
      if (matchDate > new Date()) {
        toast({
          variant: "destructive",
          description: "Match date must be in the past",
        });
        return;
      }

      // Check both teams for existing matches on the selected date
      const [homeTeamCheck, awayTeamCheck] = await Promise.all([
        checkExistingMatches(
          matchData.homeTeam.team,
          matchData.date,
          matchType
        ),
        checkExistingMatches(
          matchData.awayTeam.team,
          matchData.date,
          matchType
        ),
      ]);

      if (homeTeamCheck.hasMatch) {
        toast({
          variant: "destructive",
          description: `${homeTeamCheck.teamName} already has a match on this date.`,
        });
        return;
      }

      if (awayTeamCheck.hasMatch) {
        toast({
          variant: "destructive",
          description: `${awayTeamCheck.teamName} already has a match on this date.`,
        });
        return;
      }

      await addMatchMutation.mutateAsync({
        ...matchData,
        rating: {
          homeTeamRating: homeTeamRating,
          awayTeamRating: awayTeamRating,
        },
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit match data",
      });
    }
  };

  return (
    <div className="p-8 w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add New Match</h1>
        <Button variant="outline" onClick={() => navigate("/matches")}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Match Type</Label>
                <RadioGroup
                  value={matchType}
                  onValueChange={handleMatchTypeChange}
                  className="flex space-x-4"
                >
                  <RadioGroupItem value="ClubTeam" id="club">
                    Club Match
                  </RadioGroupItem>
                  <RadioGroupItem value="NationalTeam" id="national">
                    National Team Match
                  </RadioGroupItem>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Date</label>
                  <Input
                    type="datetime-local"
                    value={
                      matchData.date
                        ? new Date(matchData.date).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const selectedDate = new Date(
                        e.target.value
                      ).toISOString();
                      setMatchData((prev) => ({
                        ...prev,
                        date: selectedDate,
                      }));
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Venue</label>
                  <Input
                    type="text"
                    value={matchData.venue}
                    onChange={(e) =>
                      setMatchData((prev) => ({
                        ...prev,
                        venue: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="w-72">
                  <label className="block mb-1">League</label>
                  <Input
                    type="text"
                    value={matchData.league}
                    onChange={(e) =>
                      setMatchData((prev) => ({
                        ...prev,
                        league: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Home Team */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Home Team</h3>
              <div className="space-y-4">
                <TeamSelector
                  isHome={true}
                  matchType={matchType} // This will now receive 'ClubTeam' or 'NationalTeam'
                  selectedTeam={
                    matchData.homeTeam.team
                      ? {
                          value: matchData.homeTeam.team,
                          label:
                            matchType === "ClubTeam"
                              ? clubsData?.find(
                                  (club) => club._id === matchData.homeTeam.team
                                )?.name
                              : homeNationalTeams?.find(
                                  (team) => team._id === matchData.homeTeam.team
                                )
                              ? `${selectedHomeCountry?.label} ${
                                  homeNationalTeams.find(
                                    (team) =>
                                      team._id === matchData.homeTeam.team
                                  ).type
                                }`
                              : "",
                        }
                      : null
                  }
                  onTeamChange={(selected) => handleTeamChange(selected, true)}
                  clubsData={clubsData}
                  countriesData={countriesData}
                  selectedCountry={selectedHomeCountry}
                  setSelectedCountry={setSelectedHomeCountry}
                  nationalTeams={homeNationalTeams}
                  setNationalTeams={setHomeNationalTeams}
                />
                <div>
                  <label className="block mb-1">Score</label>
                  <Input
                    type="number"
                    value={matchData.homeTeam.score}
                    onChange={(e) =>
                      setMatchData((prev) => ({
                        ...prev,
                        homeTeam: {
                          ...prev.homeTeam,
                          score: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    required
                  />
                </div>

                <PlayerList
                  players={homePlayers}
                  isHome={true}
                  handlePlayerSelection={handlePlayerSelection}
                  selectedPlayers={matchData.homeTeam.players}
                  playerCount={playerCounts.home}
                />
              </div>
            </CardContent>
          </Card>

          {/* Away Team */}
          {/* Away Team */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Away Team</h3>
              <div className="space-y-4">
                <TeamSelector
                  isHome={false}
                  matchType={matchType} // This will now receive 'ClubTeam' or 'NationalTeam'
                  selectedTeam={
                    matchData.awayTeam.team
                      ? {
                          value: matchData.awayTeam.team,
                          label:
                            matchType === "ClubTeam"
                              ? clubsData?.find(
                                  (club) => club._id === matchData.awayTeam.team
                                )?.name
                              : awayNationalTeams?.find(
                                  (team) => team._id === matchData.awayTeam.team
                                )
                              ? `${selectedAwayCountry?.label} ${
                                  awayNationalTeams.find(
                                    (team) =>
                                      team._id === matchData.awayTeam.team
                                  ).type
                                }`
                              : "",
                        }
                      : null
                  }
                  onTeamChange={(selected) => handleTeamChange(selected, false)}
                  clubsData={clubsData}
                  countriesData={countriesData}
                  selectedCountry={selectedAwayCountry}
                  setSelectedCountry={setSelectedAwayCountry}
                  nationalTeams={awayNationalTeams}
                  setNationalTeams={setAwayNationalTeams}
                />

                <div>
                  <label className="block mb-1">Score</label>
                  <Input
                    type="number"
                    value={matchData.awayTeam.score}
                    onChange={(e) =>
                      setMatchData((prev) => ({
                        ...prev,
                        awayTeam: {
                          ...prev.awayTeam,
                          score: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    required
                  />
                </div>

                <PlayerList
                  players={awayPlayers}
                  isHome={false}
                  handlePlayerSelection={handlePlayerSelection}
                  selectedPlayers={matchData.awayTeam.players}
                  playerCount={playerCounts.away}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Odds Section */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Match Odds</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1">Home Win</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={matchData.odds.homeWin}
                  onChange={(e) =>
                    setMatchData((prev) => ({
                      ...prev,
                      odds: {
                        ...prev.odds,
                        homeWin: Number(Number(e.target.value).toFixed(4)) || 0,
                      },
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block mb-1">Draw</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={matchData.odds.draw}
                  onChange={(e) =>
                    setMatchData((prev) => ({
                      ...prev,
                      odds: {
                        ...prev.odds,
                        draw: Number(Number(e.target.value).toFixed(4)) || 0,
                      },
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block mb-1">Away Win</label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={matchData.odds.awayWin}
                  onChange={(e) =>
                    setMatchData((prev) => ({
                      ...prev,
                      odds: {
                        ...prev.odds,
                        awayWin: Number(Number(e.target.value).toFixed(4)) || 0,
                      },
                    }))
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/matches")}
          >
            Cancel
          </Button>
          <Button type="submit">Add Match</Button>
        </div>
      </form>
    </div>
  );
};

export default AddMatch;
