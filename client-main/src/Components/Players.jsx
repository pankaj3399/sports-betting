import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import Loader from "./Loader/Loader";
import { useNavigate } from "react-router-dom";
import PlayersTable2 from "./PlayersTable2";
import { getAllPlayers } from "../api/Player";
import { FilterIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../Components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../Components/ui/select";
import { getActiveClubs } from "../api/Clubs";
import { getPositions } from "../api/Position";
import { getCountries } from "../api/Country";
import EditPlayerModal from "./EditPlayerModal";

const POSITIONS = [
  "Attacking Midfield",
  "Center Forward",
  "Central Midfield",
  "Centre Back",
  "Coach",
  "Defensive Midfield",
  "Goalkeeper",
  "Left Back",
  "Left Winger",
  "Right Back",
  "Right Winger",
  "Second Striker",
];

const AGE_GROUPS = ["under20", "under22", "under26", "under30", "all"];

const Players = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filter, setFilter] = useState(false);
  const [positionFilter, setPositionFilter] = useState(null);
  const [ageGroup, setAgeGroup] = useState(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [showEditPlayerModal, setShowEditPlayerModal] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState(null);
  const { isLoading, error, data } = useQuery({
    queryKey: ["players", page, searchDebounce, sortBy, sortOrder, filter],
    queryFn: () =>
      getAllPlayers({
        page,
        search: searchDebounce,
        sortBy,
        sortOrder,
        filter,
        positionFilter,
        ageGroup,
      }),
  });

  const {
    isLoading: clubsDataLoading,
    error: clubsDataError,
    data: clubsData,
  } = useQuery({
    queryKey: ["clubs"],
    queryFn: getActiveClubs,
  });

  const { data: positionsData } = useQuery({
    queryKey: ["positions"],
    queryFn: () => getPositions(),
  });

  const { data: countriesData,  isLoading : countriesDataLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
  });

  const editPlayerMutation = useMutation({
    mutationFn: async (playerData) => {
      const url = `${
        import.meta.env.VITE_REACT_APP_API_URL
      }/api/player/players/${playerData._id}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(playerData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update player: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["players"]);
      setShowEditPlayerModal(false);
      setSelectedPlayer(null);
    },
  });

  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setShowEditPlayerModal(true);
  };

  const handleUpdatePlayer = async (updatedPlayerData) => {
    try {
      const cleanedData = {
        ...updatedPlayerData,
        _id: updatedPlayerData._id,
        name: updatedPlayerData.name,
        dateOfBirth: new Date(updatedPlayerData.dateOfBirth).toISOString(),
        position: updatedPlayerData.position,
        country: updatedPlayerData.country,
        rating: updatedPlayerData.rating || 1,
        currentClub: updatedPlayerData.currentClub?.club
          ? {
              club: updatedPlayerData.currentClub.club,
              from: new Date(updatedPlayerData.currentClub.from).toISOString(),
            }
          : null,
        previousClubs: updatedPlayerData.previousClubs
          .filter((club) => club.name)
          .map((club) => ({
            name: club.name,
            from: new Date(club.from).toISOString(),
            to: new Date(club.to).toISOString(),
          })),
        nationalTeams: updatedPlayerData.nationalTeams
          .filter((team) => team.name && team.type)
          .map((team) => ({
            name: team.name,
            type: team.type,
            from: new Date(team.from).toISOString(),
            to: team.currentlyPlaying
              ? null
              : team.to
              ? new Date(team.to).toISOString()
              : null,
          })),
      };

      editPlayerMutation.mutate(cleanedData);
    } catch (error) {
      console.error("Error preparing data:", error);
    }
  };

  useEffect(() => {
    const timeOutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 1000);
    return () => clearTimeout(timeOutId);
  }, [search]);

  const resetFilters = () => {
    setPositionFilter(null);
    setAgeGroup(null);
    setFilter(false);
    queryClient.invalidateQueries(["players"]);
  };

  const applyFilters = () => {
    setFilter(true);
    queryClient.invalidateQueries(["players"]);
    setFilterDialogOpen(false);
  };

  if (error) return <div>Error fetching players</div>;

  return (
    <div className="ml-5">
      <div className="flex justify-center items-center gap-10 mt-5">
        <Input
          type="text"
          placeholder="Search players..."
          className="border border-gray-400 p-1"
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <span>Filter</span>
                <FilterIcon />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Filter Players</DialogTitle>
                <DialogDescription>
                  Choose the Position and Age Group for Players.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 items-center">
                <div className="flex flex-col space-y-2">
                  <label className="font-semibold">Choose Position:</label>
                  <Select
                    value={positionFilter}
                    onValueChange={(v) => setPositionFilter(v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Choose Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="font-semibold">Choose Age Group:</label>
                  <Select
                    value={ageGroup}
                    onValueChange={(v) => setAgeGroup(v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Choose Age Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!ageGroup || !positionFilter}
                  onClick={applyFilters}
                >
                  Search
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => navigate("/addPlayer")}>Add Player</Button>
        </div>
      </div>

      <div className="w-full mt-4">
        {isLoading ? (
          <Loader className="pb-10" />
        ) : (
          <PlayersTable2
            onEdit={handleEditPlayer}
            players={data.players}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        )}
      </div>

      {showEditPlayerModal &&
        selectedPlayer &&
        positionsData &&
        countriesData && (
          <EditPlayerModal
            player={selectedPlayer}
            onClose={() => setShowEditPlayerModal(false)}
            onUpdate={handleUpdatePlayer}
            clubsData={clubsData}
            clubsDataLoading={clubsDataLoading}
            countriesDataLoading={countriesDataLoading}
            positionsData={positionsData}
            countriesData={countriesData}
          />
        )}

      <div className="flex flex-row gap-5 justify-center mt-5">
        <Button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </Button>
        <Button
          onClick={() => setPage(page + 1)}
          disabled={!data || Math.ceil(data.total / data.perPage) <= page}
        >
          Next
        </Button>
        <span className="py-2">
          {page} of {data && Math.ceil(data.total / data.perPage)}
        </span>
      </div>
    </div>
  );
};

export default Players;
