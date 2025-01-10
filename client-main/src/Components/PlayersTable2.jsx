import React from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableHeader,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

const PlayersTable2 = ({ players, sortOrder, setSortBy, setSortOrder }) => {
  const calculateAge = (dateOfBirth) => {
    const currentDate = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const isBirthdayPassed =
      currentDate.getMonth() > birthDate.getMonth() ||
      (currentDate.getMonth() === birthDate.getMonth() &&
        currentDate.getDate() >= birthDate.getDate());
    if (!isBirthdayPassed) {
      age--;
    }
    return age;
  };

  const SortableHeader = ({ title, field }) => (
    <TableHead className="font-semibold text-gray-700">
      <button
        onClick={() => {
          setSortBy(field);
          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        }}
        className="flex items-center gap-1 hover:text-gray-900"
      >
        {title}
        <ArrowUpDown className="h-4 w-4" />
      </button>
    </TableHead>
  );

  return (
    <div className="w-full overflow-auto flex justify-center items-center">
      <Table className="p-5">
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-32 font-semibold text-gray-700">
              Position
            </TableHead>
            <SortableHeader title="Player" field="name" />
            <SortableHeader title="Rating" field="rating" />
            <SortableHeader title="Country" field="country" />
            <SortableHeader title="Club" field="club" />
            <TableHead className="w-16 text-right font-semibold text-gray-700">
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
                <TableCell className="py-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {player.positionDetails.position || "N/A"}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell>{player.rating || 0}</TableCell>
                <TableCell>{player.nationalTeams[0]?.name ?? "-"}</TableCell>
                <TableCell>{player.clubDetails?.name ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">
                    {calculateAge(player.dateOfBirth)}
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