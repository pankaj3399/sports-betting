import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Card, CardContent } from "../Components/ui/card";
import Select from "react-select";
import { useToast } from "@/hooks/use-toast";
import { getActiveClubs } from "../api/Clubs";
import { getCountries, getNationalTeams } from "../api/Country";
import { RadioGroup, RadioGroupItem } from "../Components/ui/radio-group";
import { Label } from "../Components/ui/label";

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
    console.log(selectedCountry);
    
    const fetchNationalTeams = async () => {
      try {
        const teams = await getNationalTeams(selectedCountry.label);
        setNationalTeams(teams);
      } catch (error) {
        console.error("Error fetching national teams:", error);
      }
    };

    if (matchType === "NationalTeam" && selectedCountry) {
      fetchNationalTeams();
    }
  }, [selectedCountry, matchType, setNationalTeams]);

  console.log(nationalTeams);
  

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
            label: country.name,
            value: country._id,
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

const AddFixture = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [matchType, setMatchType] = useState("ClubTeam");
  const [selectedHomeCountry, setSelectedHomeCountry] = useState(null);
  const [selectedAwayCountry, setSelectedAwayCountry] = useState(null);
  const [homeNationalTeams, setHomeNationalTeams] = useState([]);
  const [awayNationalTeams, setAwayNationalTeams] = useState([]);

  const [fixtureData, setFixtureData] = useState({
    type: "ClubTeam",
    date: "",
    hour: "",
    venue: "",
    league: "",
    homeTeam: {
      team: "",
    },
    awayTeam: {
      team: "",
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
    // select: (data) =>
    //   data.map((country) =>
    //     typeof country === "string" ? country : country.country
    //   ),
  });

  const handleTeamChange = (selected, isHome) => {
    const teamKey = isHome ? "homeTeam" : "awayTeam";
    setFixtureData((prev) => ({
      ...prev,
      [teamKey]: {
        team: selected?.value || "", // Changed from club to team
      },
    }));
  };

  const addFixtureMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(
        `${import.meta.env.VITE_REACT_APP_API_URL}/api/fixture/add-fixture`,
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
        title: "Fixture Added Successfully",
      });
      navigate("/fixtures");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add fixture",
      });
    },
  });

  const handleMatchTypeChange = (value) => {
    setMatchType(value);
    setFixtureData((prev) => ({
      ...prev,
      type: value,
      homeTeam: { team: "" },
      awayTeam: { team: "" },
    }));
    setSelectedHomeCountry(null);
    setSelectedAwayCountry(null);
    setHomeNationalTeams([]);
    setAwayNationalTeams([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addFixtureMutation.mutateAsync({
        ...fixtureData,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit fixture data",
      });
    }
  };

  return (
    <div className="p-8 w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add Fixture</h1>
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
                  <label className="block mb-1">Date and Hour of match</label>
                  <Input
                    type="datetime-local"
                    value={
                      fixtureData.date
                        ? new Date(fixtureData.date).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const selectedDate = new Date(
                        e.target.value
                      ).toISOString();
                      const selectedHour = new Date(e.target.value)
                        .toTimeString()
                        .slice(0, 5);
                      setFixtureData((prev) => ({
                        ...prev,
                        date: selectedDate,
                        hour: selectedHour,
                      }));
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Venue</label>
                  <Input
                    type="text"
                    value={fixtureData.venue}
                    onChange={(e) =>
                      setFixtureData((prev) => ({
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
                  value={fixtureData.league}
                  onChange={(e) =>
                    setFixtureData((prev) => ({
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
                    fixtureData.homeTeam.team
                      ? {
                          value: fixtureData.homeTeam.team,
                          label:
                            matchType === "ClubTeam"
                              ? clubsData?.find(
                                  (club) =>
                                    club._id === fixtureData.homeTeam.team
                                )?.name
                              : homeNationalTeams?.find(
                                  (team) =>
                                    team._id === fixtureData.homeTeam.team
                                )
                              ? `${selectedHomeCountry?.label} ${
                                  homeNationalTeams.find(
                                    (team) =>
                                      team._id === fixtureData.homeTeam.team
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
                  matchType={matchType} // This will now receive 'ClubTeam' or 'NationalTeam'
                  selectedTeam={
                    fixtureData.awayTeam.team
                      ? {
                          value: fixtureData.awayTeam.team,
                          label:
                            matchType === "ClubTeam"
                              ? clubsData?.find(
                                  (club) =>
                                    club._id === fixtureData.awayTeam.team
                                )?.name
                              : awayNationalTeams?.find(
                                  (team) =>
                                    team._id === fixtureData.awayTeam.team
                                )
                              ? `${selectedAwayCountry?.label} ${
                                  awayNationalTeams.find(
                                    (team) =>
                                      team._id === fixtureData.awayTeam.team
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
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/fixtures")}
          >
            Cancel
          </Button>
          <Button type="submit">Add Fixture</Button>
        </div>
      </form>
    </div>
  );
};

export default AddFixture;
