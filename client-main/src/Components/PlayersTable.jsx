import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableHeader,
} from "../Components/ui/table";
import { Button } from "../Components/ui/button";
import { Edit, TrophyIcon } from "lucide-react";

const PlayersTable = ({
  players,
  onEdit,
  onNavigateToMatch,
  isClub = true,
}) => {
  const calculateRating = ({ player }) => {
    const totalRating = player.ratingHistory.reduce(
      (acc, currRating) => acc + currRating.newRating,
      0
    );
    return totalRating.toFixed(2);
  };

  return (
    <div className="h-full overflow-y-auto">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200">
              Name
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200">
              Position
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200">
              Country
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
              Date of Birth
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200 text-center">
              Actions
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200 text-right">
              Rating
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players?.length > 0 ? (
            players.map((player) => (
              <TableRow
                key={player._id}
                className="hover:bg-gray-50 transition-colors"
              >
                <TableCell className="font-medium truncate py-3">
                  {player.name}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {player.position?.position || "N/A"}
                  </span>
                </TableCell>
                <TableCell>{player.country?.country || "N/A"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {player.dateOfBirth
                    ? new Date(player.dateOfBirth).toLocaleDateString()
                    : "N/A"}
                </TableCell>
                <TableCell className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() => onEdit(player)}
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center justify-center gap-2 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  {isClub && (
                    <Button
                      onClick={() => onNavigateToMatch(player)}
                      variant="outline"
                      size="sm"
                      className="inline-flex items-center justify-center gap-2 hover:bg-gray-100"
                    >
                      <TrophyIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Matches</span>
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">
                    {calculateRating({ player })}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                No players found for this {isClub ? "club" : "national team"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PlayersTable;
