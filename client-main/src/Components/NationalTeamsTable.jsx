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
import {  Users } from "lucide-react";

const NationalTeamsTable = ({ data, onViewPlayers }) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold p-3">National Team</TableHead>
            <TableHead className="font-semibold p-3">Type</TableHead> 
            <TableHead className="font-semibold p-3">Actions</TableHead>
            <TableHead className="font-semibold p-3">Rating</TableHead>
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
              <TableCell>
                {team.rating}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default NationalTeamsTable;
