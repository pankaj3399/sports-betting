import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getActiveClubs } from "../api/Clubs";
import { getCountries } from "../api/Country";
import { Card, CardContent, CardTitle } from "./ui/card";
import { Label } from "@radix-ui/react-label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Input } from "./ui/input";
import { PlayerList, TeamSelector } from "./AddMatch";
import { useLocation } from "react-router-dom";

const PredictMatchPage = () => {
  const { toast } = useToast();
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [homeNationalTeams, setHomeNationalTeams] = useState([]);
  const [awayNationalTeams, setAwayNationalTeams] = useState([]);
  const [homeTeamRating, setHomeTeamRating] = useState(0);
  const [awayTeamRating, setAwayTeamRating] = useState(0);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const params = Object.fromEntries(queryParams);
  const [matchType, setMatchType] = useState(params.matchType ?? "ClubTeam");
  const [selectedHomeCountry, setSelectedHomeCountry] = useState(
    matchType === "NationalTeam"
      ? { value: params.homeCountry, label: params.homeCountry }
      : null
  );
  const [selectedAwayCountry, setSelectedAwayCountry] = useState(
    matchType === "NationalTeam"
      ? { value: params.awayCountry, label: params.awayCountry }
      : null
  );

  const [playerCounts, setPlayerCounts] = useState({
    home: 0,
    away: 0,
  });
  const [isPredicted, setIsPredicted] = useState(false);
  const [matchData, setMatchData] = useState({
    type: params.matchType ?? "ClubTeam",
    date: params.date ?? "",
    venue: params.venue ?? "",
    league: params.league ?? "",
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
        team: selected?.value || "",
        score: "",
        players: [],
      },
    }));

    setPlayerCounts((prev) => ({
      ...prev,
      [isHome ? "home" : "away"]: 0,
    }));
  };

  const calculateTotalTeamRating = (players) => {
    const totalRating = players.reduce((teamAcc, p) => {
      const playerTotal = p.player.ratingHistory.reduce(
        (acc, r) => acc + r.newRating,
        0
      );
      return teamAcc + playerTotal;
    }, 0);
    return totalRating.toFixed(2);
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

  const getMatchesByTeam = async ({ teamId }) => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_REACT_APP_API_URL
        }/api/match/get-all-matches?teamId=${teamId}`
      );
      const data = await response.json();
      return data.matches;
    } catch (error) {
      toast({
        title: error.message,
        variant: "destructive",
      });
    }
  };

  async function findMaxTeamPlayersMatches(matchData, teamId) {
    try {
      // Selected team players
      const teamPlayers =
        matchData.awayTeam.team === teamId
          ? matchData.awayTeam.players.map((p) => p._id)
          : matchData.homeTeam.players.map((p) => p._id);

      // Fetch matches for the given team
      const matches = await getMatchesByTeam({ teamId });

      console.log("Fetched Matches:", matches);

      const matchPlayerCounts = matches.map((match) => {
        const playersInMatch =
          match.homeTeam.team === teamId
            ? match.homeTeam.players.map((p) => p._id)
            : match.awayTeam.players.map((p) => p._id);

        const playerCount = playersInMatch.filter((playerId) =>
          teamPlayers.includes(playerId)
        ).length;

        return { match, playerCount };
      });

      const maxPlayerCount = Math.max(
        0,
        ...matchPlayerCounts.map((entry) => entry.playerCount)
      );

      // Get matches with the maximum player count
      const maxMatches = matchPlayerCounts
        .filter((entry) => entry.playerCount === maxPlayerCount)
        .map((entry) => entry.match);

      return { maxMatches, maxPlayerCount };
    } catch (error) {
      console.error("Error finding max team player matches:", error);
      throw error;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsPredicted(true);

    const homeTeamMatches = await findMaxTeamPlayersMatches(
      matchData,
      matchData.homeTeam.team
    );
    const awayTeamMatches = await findMaxTeamPlayersMatches(
      matchData,
      matchData.awayTeam.team
    );
    setHomeTeamRating(
      homeTeamMatches.maxMatches.reduce(
        (acc, match) =>
          acc +
          (match.awayTeam.team === matchData.homeTeam.team
            ? match.rating.awayTeamRating
            : match.rating.homeTeamRating),
        0
      )
    );

    setAwayTeamRating(
      awayTeamMatches.maxMatches.reduce(
        (acc, match) =>
          acc +
          (match.awayTeam.team === matchData.awayTeam.team
            ? match.rating.awayTeamRating
            : match.rating.homeTeamRating),
        0
      )
    );
  };

  return (
    <div className="p-8 w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Predict Match</h1>
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
                  matchType={matchType}
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
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Away Team</h3>
              <div className="space-y-4">
                <TeamSelector
                  isHome={false}
                  matchType={matchType}
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

        <div className="flex justify-end gap-4">
          <Button type="submit">Predict Match</Button>
        </div>
      </form>
      {isPredicted && (
        <Card className="p-5">
          <CardTitle className="mt-2 mb-6">Predictions</CardTitle>
          <CardContent>
            <div className="flex items-center gap-3 my-2">
              <Label>Home Team Players Rating:</Label>
              <Input
                value={
                  calculateTotalTeamRating(matchData.homeTeam.players) ?? 0
                }
                disabled
                className="font-bold text-black"
              />
            </div>
            <div className="flex items-center gap-3 my-2">
              <Label>Away Team Players Rating:</Label>
              <Input
                value={
                  calculateTotalTeamRating(matchData.awayTeam.players) ?? 0
                }
                disabled
                className="font-bold text-black"
              />
            </div>
            <div className="flex items-center gap-3 my-2">
              <Label>Home Team Rating:</Label>
              <Input
                value={homeTeamRating.toFixed(2)}
                disabled
                className="font-bold text-black"
              />
            </div>
            <div className="flex items-center gap-3 my-2">
              <Label>Away Team Rating:</Label>
              <Input
                value={awayTeamRating.toFixed(2)}
                disabled
                className="font-bold text-black"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PredictMatchPage;
