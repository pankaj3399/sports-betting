import React from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableHeader,
} from "./components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "./components/ui/button";

const FixturesTable = ({ fixtures, sortOrder, setSortBy, setSortOrder, handleAddMatch, handlePredictMatch }) => {
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer flex items-center gap-1.5">
              <span className="">Date</span>
              <ArrowUpDown
                onClick={() => {
                  sortOrder === "asc"
                    ? setSortOrder("desc")
                    : setSortOrder("asc"),
                    setSortBy("date");
                }}
              />
            </TableHead>
            <TableHead className="w-[80px]">Hour</TableHead>
            <TableHead className="text-center">Match</TableHead>
            <TableHead className="text-center cursor-pointer flex items-center gap-1.5">
              <span>Rate Diff</span>
              <ArrowUpDown
                onClick={() => {
                  sortOrder === "asc"
                    ? setSortOrder("desc")
                    : setSortOrder("asc"),
                    setSortBy("ratingDiff");
                }}
              />
            </TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fixtures?.length > 0 ? (
            fixtures.map((fixture) => (
              <TableRow key={fixture._id}>
                <TableCell className="text-left">
                  <span className="font-medium">
                    {formatDate(fixture.date)}
                  </span>
                </TableCell>
                <TableCell>{fixture.hour}</TableCell>
                <div className="flex justify-evenly items-center gap-2">
                  <TableCell className="text-center">
                    {fixture.type === "ClubTeam" ? fixture.homeTeam?.team?.name ?? "" : fixture.homeTeam?.team?.country ?? "" }
                  </TableCell>
                  <TableCell className="text-center">
                    {fixture.homeTeam?.rating ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    {fixture.type === "ClubTeam" ? fixture.awayTeam?.team?.name ?? "" : fixture.awayTeam?.team?.country ?? "" }
                  </TableCell>
                  <TableCell className="text-center">
                    {fixture.awayTeam?.rating ?? 0}
                  </TableCell>
                </div>
                <TableCell className="font-medium text-left">
                  {fixture.ratingDiff?.toFixed(2) ?? 0}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center items-center space-x-2">
                    <Button onClick={() => handleAddMatch({fixture})} size="sm">Add Match</Button>
                    <Button onClick={() => handlePredictMatch({fixture})} size="sm">
                      Predict
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center">
                No fixtures found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default FixturesTable;
