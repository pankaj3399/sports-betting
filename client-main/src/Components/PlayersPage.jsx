import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "../Components/ui/button";
import { ChevronLeft } from "lucide-react";
import PlayersTable from './PlayersTable';
import EditPlayerModal from './EditPlayerModal';
import Loader from './Loader/Loader';

const PlayersPage = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [showEditPlayerModal, setShowEditPlayerModal] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState(null);
  const queryClient = useQueryClient();

  const { data: playersData, isLoading, error } = useQuery({
    queryKey: ['clubPlayers', clubId],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_REACT_APP_API_URL}/api/club/${clubId}/players`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch players: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!clubId,
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => getPositions(),
  });

  const { data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: () => getCountries(),
  });

  const editPlayerMutation = useMutation({
    mutationFn: async (playerData) => {
      const url = `${import.meta.env.VITE_REACT_APP_API_URL}/api/player/players/${playerData._id}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(playerData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update player: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubPlayers', clubId]);
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
        currentClub: updatedPlayerData.currentClub?.club ? {
          club: updatedPlayerData.currentClub.club,
          from: new Date(updatedPlayerData.currentClub.from).toISOString()
        } : null,
        previousClubs: updatedPlayerData.previousClubs
          .filter(club => club.name)
          .map(club => ({
            name: club.name,
            from: new Date(club.from).toISOString(),
            to: new Date(club.to).toISOString()
          })),
        nationalTeams: updatedPlayerData.nationalTeams
          .filter(team => team.name && team.type)
          .map(team => ({
            name: team.name,
            type: team.type,
            from: new Date(team.from).toISOString(),
            to: team.currentlyPlaying ? null : team.to ? new Date(team.to).toISOString() : null
          }))
      };
      
      editPlayerMutation.mutate(cleanedData);
    } catch (error) {
      console.error("Error preparing data:", error);
    }
  };

  if (isLoading) return <Loader />;
  if (error) return <div>Error fetching players data</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button 
          onClick={() => navigate(-1)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Clubs
        </Button>
        <h1 className="text-2xl font-semibold">Club Players</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <PlayersTable 
          players={playersData} 
          onEdit={handleEditPlayer}
        />
      </div>

      {showEditPlayerModal && selectedPlayer && positionsData && countriesData && (
        <EditPlayerModal
          player={selectedPlayer}
          onClose={() => setShowEditPlayerModal(false)}
          onUpdate={handleUpdatePlayer}
          clubsData={[]} // You might want to fetch clubs data here
          positionsData={positionsData}
          countriesData={countriesData}
        />
      )}
    </div>
  );
};

export default PlayersPage;