import React from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableHeader,
} from "../Components/ui/table";
import { Button } from "../Components/ui/button";
import { ArrowUpDown, Users } from "lucide-react";

const NationalTeamsTable = ({
  data,
  onViewPlayers,
  sortOrder,
  setSortOrder,
  setSortBy,
}) => {
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field={"country"} title={"National Team"} />
            <TableHead className="font-semibold p-3">Type</TableHead>
            <TableHead className="font-semibold p-3">Actions</TableHead>
            <SortableHeader field={"rating"} title={"Rating"} />
            <SortableHeader field={"netRating"} title={"Net Rating"} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.teams?.map((team) => (
            <TableRow key={team._id}>
              <TableCell>{team.country}</TableCell>
              <TableCell>{team.type}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onViewPlayers(team._id)}
                    variant="default"
                    className="mr-2"
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <p>See Players</p>
                      <Users size={16} />
                    </div>
                  </Button>
                </div>
              </TableCell>
              <TableCell>{team.rating}</TableCell>
              <TableCell>{team?.netRating?.toFixed(2) ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default NationalTeamsTable;
