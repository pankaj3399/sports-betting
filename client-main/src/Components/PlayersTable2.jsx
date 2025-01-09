import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableHeader,
} from "../Components/ui/table";
import { LucideSortAsc, LucideSortDesc } from "lucide-react";
const PlayersTable2 = ({ players, sortOrder, setSortBy, setSortOrder }) => {
  const calculateAge = ({ player }) => {
    const currentDate = new Date();
    const birthDate = new Date(player.dateOfBirth);

    let age = currentDate.getFullYear() - birthDate.getFullYear();

    // Adjust age if the current date is before the player's birthdate this year
    const isBirthdayPassed =
      currentDate.getMonth() > birthDate.getMonth() ||
      (currentDate.getMonth() === birthDate.getMonth() &&
        currentDate.getDate() >= birthDate.getDate());

    if (!isBirthdayPassed) {
      age--;
    }

    return age;
  };

  return (
    <div className="h-full overflow-y-auto">
      <Table className="w-[1350px] mx-auto">
        <TableHeader className="px-20">
          <TableRow>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200">
              Position
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200">
            <div className="flex items-center gap-1.5">
                <span className="font-semibold">Player</span>
                <span className="cursor-pointer">
                  {sortOrder === "asc" ? (
                    <LucideSortDesc
                      onClick={() => {
                        setSortBy("name");
                        setSortOrder("desc");
                      }}
                    />
                  ) : (
                    <LucideSortAsc
                      onClick={() => {
                        setSortBy("name");
                        setSortOrder("asc");
                      }}
                    />
                  )}
                </span>
            </div>
            </TableHead>
            <TableHead className="flex items-center gap-1.5 p-3">
              <span className="font-semibold">Rating</span>
              <span className="cursor-pointer">
                {sortOrder === "asc" ? (
                  <LucideSortDesc
                    onClick={() => {
                      setSortBy("rating");
                      setSortOrder("desc");
                    }}
                  />
                ) : (
                  <LucideSortAsc
                    onClick={() => {
                      setSortBy("rating");
                      setSortOrder("asc");
                    }}
                  />
                )}
              </span>
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
              Country
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200 text-center">
              Club
            </TableHead>
            <TableHead className="w-1/6 font-semibold text-gray-700 border-b border-gray-200 text-right">
              Age
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
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {player.positionDetails.position || "N/A"}
                  </span>
                </TableCell>
                <TableCell className="font-medium truncate py-3">
                  {player.name}
                </TableCell>
                <TableCell>{player.rating || 0}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {player.nationalTeams[0]?.name ?? "NaN"}
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center justify-center gap-2">
                    {player.clubDetails?.name}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">
                    {calculateAge({ player })}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                No players found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PlayersTable2;
