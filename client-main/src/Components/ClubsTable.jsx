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
  Edit,
  LucideSortAsc,
  LucideSortDesc,
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
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-3 flex items-center gap-1.5">
              <span className="font-semibold">Club Name</span>
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
            </TableHead>
            <TableHead className="font-semibold p-3">Actions</TableHead>
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
              <TableCell>{club.rating}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClubsTable;
