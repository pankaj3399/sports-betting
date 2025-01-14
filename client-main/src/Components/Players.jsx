import React, { useState, useEffect } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import Loader from "./Loader/Loader";
import { useNavigate } from "react-router-dom";
import PlayersTable2 from "./PlayersTable2";
import { getAllPlayers } from "../api/Player";

const Players = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  
  const { isLoading, error, data } = useQuery({
    queryKey: ["players", page, searchDebounce, sortBy, sortOrder],
    queryFn: () => getAllPlayers({ page, search, sortBy, sortOrder }),
  });

  useEffect(() => {
    const timeOutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 1000);
    return () => clearTimeout(timeOutId);
  }, [search]);

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
        <Button onClick={() => navigate("/addPlayer")} variant="green">
          Add Player
        </Button>
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
