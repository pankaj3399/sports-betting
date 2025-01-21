import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import Loader from "./Loader/Loader";
import { useNavigate } from "react-router-dom";
import PlayersTable2 from "./PlayersTable2";
import { getAllPlayers } from "../api/Player";
import { FilterIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../Components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../Components/ui/select";
 
const POSITIONS = [
  "Attacking Midfield",
  "Center Forward",
  "Central Midfield",
  "Centre Back",
  "Coach",
  "Defensive Midfield",
  "Goalkeeper",
  "Left Back",
  "Left Winger",
  "Right Back",
  "Right Winger",
  "Second Striker",
];

const AGE_GROUPS = ["under20", "under22", "under26", "under30", "all"];

const Players = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filter, setFilter] = useState(false);
  const [positionFilter, setPositionFilter] = useState(null);
  const [ageGroup, setAgeGroup] = useState(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  const { isLoading, error, data } = useQuery({
    queryKey: ["players", page, searchDebounce, sortBy, sortOrder, filter],
    queryFn: () =>
      getAllPlayers({
        page,
        search: searchDebounce,
        sortBy,
        sortOrder,
        filter,
        positionFilter,
        ageGroup,
      }),
  });

  useEffect(() => {
    const timeOutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 1000);
    return () => clearTimeout(timeOutId);
  }, [search]);

  const resetFilters = () => {
    setPositionFilter(null);
    setAgeGroup(null);
    setFilter(false);
    queryClient.invalidateQueries(["players"]);
  };

  const applyFilters = () => {
    setFilter(true);
    queryClient.invalidateQueries(["players"]);
    setFilterDialogOpen(false);
  };

  if (error) return <div>Error fetching players</div>;

  return (
    <div className="ml-5">
      <div className="flex justify-center items-center gap-10 mt-5">
        <Input
          type="text"
          placeholder="Search players..."
          className="border border-gray-400 p-1"
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <span>Filter</span>
                <FilterIcon />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Filter Players</DialogTitle>
                <DialogDescription>
                  Choose the Position and Age Group for Players.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 items-center">
                <div className="flex flex-col space-y-2">
                  <label className="font-semibold">Choose Position:</label>
                  <Select
                    value={positionFilter}
                    onValueChange={(v) => setPositionFilter(v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Choose Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="font-semibold">Choose Age Group:</label>
                  <Select
                    value={ageGroup}
                    onValueChange={(v) => setAgeGroup(v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Choose Age Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!ageGroup || !positionFilter}
                  onClick={applyFilters}
                >
                  Search
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => navigate("/addPlayer")}>Add Player</Button>
        </div>
      </div>

      <div className="w-full mt-4">
        {isLoading ? (
          <Loader className="pb-10" />
        ) : (
          <PlayersTable2
            players={data.players}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />
        )}
      </div>

      <div className="flex flex-row gap-5 justify-center mt-5">
        <Button onClick={() => setPage(page - 1)} disabled={page === 1}>
          Previous
        </Button>
        <Button
          onClick={() => setPage(page + 1)}
          disabled={!data || Math.ceil(data.total / data.perPage) <= page}
        >
          Next
        </Button>
        <span className="py-2">
          {page} of {data && Math.ceil(data.total / data.perPage)}
        </span>
      </div>
    </div>
  );
};

export default Players;
