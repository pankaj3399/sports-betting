import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import MatchesTable from "./MatchesTable";
import Loader from "./Loader/Loader";
import { deleteMatch, deleteOldMatches, fetchMatches } from "../api/Match";
import { toast } from "../hooks/use-toast";

const Matches = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const teamName = decodeURIComponent(queryParams.get("team") ?? "");
  const playerId = decodeURIComponent(queryParams.get("player") ?? "");
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["matches", page, searchDebounce, teamName, playerId],
    queryFn: () => fetchMatches({ page, search, teamName, playerId }),
  });

  const { mutateAsync : handleDeleteMatch} = useMutation({
    mutationKey : ['delete-match'],
    mutationFn : deleteMatch,
    onSuccess : () => {
      queryClient.invalidateQueries('matches');
      toast({
        title : "Match Successfully Deleted"
      });
    },
    onError : (e) => {      
      toast({
        title : e.message
      })
    }
  })

  const { mutateAsync : handleDeleteOldMatches} = useMutation({
    mutationKey : ['delete-old-matches'],
    mutationFn : deleteOldMatches,
    onSuccess : (data) => {
      queryClient.invalidateQueries('matches');
      toast({
        title : data?.message ?? "Old Matches Successfully Deleted"
      });
    },
    onError : (e) => {      
      toast({
        title : e.message
      })
    }
  })

  useEffect(() => {
    const timeOutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 1000);
    return () => clearTimeout(timeOutId);
  }, [search]);

  if (error)
    return (
      <div className="p-8">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    );

  if (!data || !data.matches)
    return (
      <div className="p-8">
        <div>No matches data available</div>
      </div>
    );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="Search matches based on teams"
            value={search}
            autoFocus
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/matches/add")}>Add Match</Button>
          <Button variant="destructive" onClick={handleDeleteOldMatches}>Delete Old Matches</Button>

        </div>
      </div>

      {isLoading ? <Loader /> : <MatchesTable matches={data.matches} onDelete={handleDeleteMatch} />}

      <div className="flex justify-center items-center gap-4 mt-6">
        <Button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span>
          Page {page} of {(data && data.totalPages) || 1}
        </span>
        <Button
          onClick={() => setPage((p) => p + 1)}
          disabled={!data.totalPages || page >= data.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Matches;
