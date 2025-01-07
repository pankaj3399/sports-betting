import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPositions } from "../api/Position";
import {
  getAllNationalTeams,
  getCountries,
  getNationalTeamPlayers,
} from "../api/Country";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import Loader from "./Loader/Loader";
import EditPlayerModal from "./EditPlayerModal";
import PlayersTable from "./PlayersTable";
import { useNavigate } from "react-router-dom";
import NationalTeamsTable from "./NationalTeamsTable";

const NationalTeamsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const queryClient = useQueryClient();
  const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sortBy, setSortBy] = useState("country");
  const [sortOrder, setSortOrder] = useState("asc");

  const { isLoading, error, data } = useQuery({
    queryKey: ["nationalTeams", page, searchDebounce, sortBy, sortOrder],
    queryFn: () => getAllNationalTeams({ page, search, sortBy, sortOrder }),
  });
  const { data: positionsData } = useQuery({
    queryKey: ["positions"],
    queryFn: () => getPositions(),
  });

  const { data: countriesData } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
  });
  const {
    data: playersData,
    isLoading: isLoadingPlayers,
    error: playersError,
  } = useQuery({
    queryKey: ["nationalTeamPlayers", selectedTeamId],
    queryFn: () => getNationalTeamPlayers(teamId),
  });
  useEffect(() => {
    const timeOutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 1000);
    return () => clearTimeout(timeOutId);
  }, [search]);

  const handleViewPlayers = (teamId) => {
    navigate(`/national-teams/${teamId}/players`);
  };

  const handleClosePlayersModal = () => {
    setShowPlayersModal(false);
    setSelectedClubId(null);
    queryClient.removeQueries(["clubPlayers", selectedClubId]);
  };


  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setShowEditPlayerModal(true);
  };

  const handleUpdatePlayer = async (updatedPlayerData) => {
    try {
      console.log("Sending update request with data:", updatedPlayerData);
      const response = await updatePlayer(
        updatedPlayerData._id,
        updatedPlayerData
      );
      console.log("Update response:", response);

      if (response.success) {
        // Update your local state or refetch data
        toast({
          description: "Player updated successfully",
        });
        onClose(); // Close the modal
      } else {
        toast({
          variant: "destructive",
          description: "Failed to update player",
        });
      }
    } catch (error) {
      console.error("Update error:", error);
      toast({
        variant: "destructive",
        description: error.response?.data?.message || "Error updating player",
      });
    }
  };

  if (error) return <div>Error fetching data</div>;

  return (
    <div className="ml-5">
      <div className="flex justify-center items-center gap-10 mt-5">
        <Input
          type="text"
          placeholder="Search national teams..."
          className="border border-gray-400 p-1"
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-4 p-4">
        <div className="h-40 w-56 mx-3 mt-5 p-5 border border-slate-300 rounded-lg shadow-sm bg-white">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Sort By</h2>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              name="sortBy"
              id="sortByCountry"
              className="form-radio text-blue-600 focus:ring-blue-500"
              checked={sortBy === "country"}
              onChange={(e) => setSortBy("country")}
            />
            <label htmlFor="sortByCountry" className="text-slate-600">
              Country
            </label>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              name="sortBy"
              id="sortByRating"
              className="form-radio text-blue-600 focus:ring-blue-500"
              checked={sortBy === "rating"}
              onChange={(e) => setSortBy("rating")}
            />
            <label htmlFor="sortByRating" className="text-slate-600">
              Rating
            </label>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <label htmlFor="sortOrder" className="text-slate-600">
              Order:
            </label>
            <select
              id="sortOrder"
              className="border border-slate-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        <div className="w-full mt-4">
          {isLoading ? (
            <Loader />
          ) : (
            <NationalTeamsTable data={data} onViewPlayers={handleViewPlayers} />
          )}
        </div>
      </div>

      <div className="flex flex-row gap-5 justify-center mt-5">
        <Button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </Button>
        <Button
          onClick={() => setPage(page + 1)}
          disabled={!data || data.totalPages <= page}
        >
          Next
        </Button>
        <span className="py-2">
          {page} of {data && data.totalPages}
        </span>
      </div>

      {/* Players Modal */}
      {showPlayersModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col h-[90vh]">
            <div className="px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Team Players</h2>
                <button
                  onClick={handleClosePlayersModal}
                  className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {playersData && (
                <PlayersTable players={playersData} onEdit={handleEditPlayer} />
              )}
            </div>

            <div className="px-6 py-4 border-t mt-auto">
              <div className="flex justify-end">
                <Button onClick={handleClosePlayersModal} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Player Modal */}
      {showEditPlayerModal &&
        selectedPlayer &&
        positionsData &&
        countriesData &&
        data?.clubs && (
          <EditPlayerModal
            player={selectedPlayer}
            onClose={() => setShowEditPlayerModal(false)}
            onUpdate={handleUpdatePlayer}
            clubsData={data.clubs}
            positionsData={positionsData}
            countriesData={countriesData}
          />
        )}
    </div>
  );
};

export default NationalTeamsPage;
