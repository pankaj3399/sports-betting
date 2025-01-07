import React from 'react';
import { Table, TableHead, TableRow, TableBody, TableCell, TableHeader } from "../Components/ui/table";
import { Button } from "../Components/ui/button";
import { Edit, Trash2, Users } from "lucide-react";

const ClubsTable = ({ data, onViewPlayers, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold p-3">Club Name</TableHead>
            <TableHead className="font-semibold p-3">Actions</TableHead>
            <TableHead className="font-semibold p-3">Rating</TableHead>
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
                    onClick={() => onEdit(club)}
                    variant="yellow"
                    className="mr-2"
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <p>Edit</p>
                      <Edit size={16} />
                    </div>
                  </Button>
                  <Button
                    onClick={() => onDelete(club._id)}
                    variant="red"
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <p>Delete</p>
                      <Trash2 size={16} color="red" />
                    </div>
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                {club.rating}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClubsTable;