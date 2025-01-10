import React, { useState } from "react";
import MatchLineup from "./MatchLineup";
import { Dialog, DialogContent } from "../Components/ui/dialog";
import { PencilIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MatchesTable = ({ matches }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showLineup, setShowLineup] = useState(false);
  const navigate = useNavigate();

  if (!matches || matches.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        No matches found
      </div>
    );
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatOdds = (odds) => {
    if (!odds) return "N/A";
    try {
      const { homeWin, draw, awayWin } = odds;
      return `${Number(homeWin).toFixed(4)} / ${Number(draw).toFixed(
        4
      )} / ${Number(awayWin).toFixed(4)}`;
    } catch (error) {
      return "N/A";
    }
  };

  const getTeamName = (team, type) => {
    if (!team?.team) return "Unknown Team";
    if (type === "ClubTeam") {
      return team.team.name || "Unknown Team";
    }
    return `${team.team.country} ${team.team.type}` || "Unknown Team";
  };

  const handleLineupClick = (match) => {
    setSelectedMatch(match);
    setShowLineup(true);
  };

  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="bg-gray-200 p-2 text-left">Date</th>
            <th className="bg-gray-200 p-2 text-left">Type</th>
            <th className="bg-gray-200 p-2 text-left">Home Team</th>
            <th className="bg-gray-200 p-2 text-center">Score</th>
            <th className="bg-gray-200 p-2 text-left">Away Team</th>
            <th className="bg-gray-200 p-2 text-left">Venue</th>
            <th className="bg-gray-200 p-2 text-left">Lineup</th>
            <th className="bg-gray-200 p-2 text-left">Odds</th>
            <th className="bg-gray-200 p-2 text-left"></th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr
              key={match?._id || Math.random()}
              className="hover:bg-gray-100 transition-colors"
            >
              <td className="border-b p-2">
                <div className="text-gray-600">{formatDate(match?.date)}</div>
              </td>
              <td className="border-b p-2">
                <div className="text-gray-600">{match?.type || "N/A"}</div>
              </td>
              <td className="border-b p-2">
                <div className="font-medium">
                  {getTeamName(match?.homeTeam, match?.type)}
                </div>
              </td>
              <td className="border-b p-2 text-center font-semibold">
                <div className="flex items-center justify-center">
                  <span>{match?.homeTeam?.score ?? "-"}</span>
                  <span className="mx-2">-</span>
                  <span>{match?.awayTeam?.score ?? "-"}</span>
                </div>
              </td>
              <td className="border-b p-2">
                <div className="font-medium">
                  {getTeamName(match?.awayTeam, match?.type)}
                </div>
              </td>
              <td className="border-b p-2">
                <div className="text-gray-600">{match?.venue || "N/A"}</div>
              </td>
              <td className="border-b p-2">
                <button
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  onClick={() => handleLineupClick(match)}
                  disabled={
                    !match?.homeTeam?.players?.length &&
                    !match?.awayTeam?.players?.length
                  }
                >
                  View Lineup
                </button>
              </td>
              <td className="border-b p-2">
                <div className="text-gray-600">{formatOdds(match?.odds)}</div>
              </td>
              <td className="border-b p-2 hover:underline cursor-pointer">
                <div
                  onClick={() => navigate(`/match/edit/${match._id}`)}
                  className="text-gray-600 flex items-center gap-1.5"
                >
                  <span>Edit</span>
                  <PencilIcon size={20} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={showLineup} onOpenChange={setShowLineup}>
        <DialogContent className="max-w-4xl">
          {selectedMatch && <MatchLineup match={selectedMatch} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatchesTable;
