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
import {
  ArrowUpDown,
  Edit,
  Trash2,
  TrophyIcon,
  Users,
} from "lucide-react";

const ClubsTable = ({
  data,
  onViewPlayers,
  onEdit,
  onDelete,
  sortOrder,
  setSortBy,
  setSortOrder,
  onNavigation,
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
            <SortableHeader field={"name"} title={"Club Name"} />
            <TableHead className="font-semibold p-3">Actions</TableHead>
            <SortableHeader field={"rating"} title={"Rating"} />
            <SortableHeader field={"netRating"} title={"Net Rating"} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.clubs?.map((club) => (
            <TableRow key={club._id}>
              <TableCell>{club.name}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onViewPlayers(club._id)}
                    variant="default"
                    className="mr-2"
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <p>See Players</p>
                      <Users size={16} />
                    </div>
                  </Button>
                  <Button
                    onClick={() => onNavigation(club.name)}
                    variant="default"
                    className="mr-2"
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <p>See Matches</p>
                      <TrophyIcon size={16} />
                    </div>
                  </Button>
                  <Button
                    onClick={() => onEdit(club)}
                    variant="yellow"
                    className="mr-2"
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <p>Edit</p>
                      <Edit size={16} />
                    </div>
                  </Button>
                  <Button onClick={() => onDelete(club._id)} variant="red">
                    <div className="flex flex-row gap-2 items-center">
                      <p>Delete</p>
                      <Trash2 size={16} color="red" />
                    </div>
                  </Button>
                </div>
              </TableCell>
              <TableCell>{club.rating.toFixed(2)}</TableCell>
              <TableCell>{club?.netRating?.toFixed(2) ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClubsTable;
