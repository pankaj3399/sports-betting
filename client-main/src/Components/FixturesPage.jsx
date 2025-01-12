import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import Loader from "./Loader/Loader";
import { useNavigate } from "react-router-dom";
import { getFixtures } from "../api/Fixtures";
import FixturesTable from "./FixturesTable";

const FixturesPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");

  const { isLoading, error, data } = useQuery({
    queryKey: ["fixtures", page, searchDebounce, sortBy, sortOrder],
    queryFn: () => getFixtures({ page, search, sortBy, sortOrder }),
  });

  useEffect(() => {
    const timeOutId = setTimeout(() => {
      setSearchDebounce(search);
    }, 1000);
    return () => clearTimeout(timeOutId);
  }, [search]);

  const handleAddMatch = ({fixture}) => {
    const baseParams = {
      matchType: fixture.type,
      date: fixture.date,
      venue: fixture.venue,
      league: fixture.league // Fixed typo: was fixture.venue
    };
  
    let params;
    if (fixture.type === 'NationalTeam') {
      params = {
        ...baseParams,
        homeCountry: fixture.homeTeam.team.country,
        awayCountry: fixture.awayTeam.team.country,
        homeTeam: fixture.homeTeam.team._id,
        awayTeam: fixture.awayTeam.team._id
      };
    } else {
      params = {
        ...baseParams,
        homeTeam: fixture.homeTeam.team._id,
        awayTeam: fixture.awayTeam.team._id
      };
    }
  
    const queryString = new URLSearchParams(params).toString();
    navigate(`/matches/add?${queryString}`);
  };
  
  const handlePredictMatch = ({fixture}) => {
    const baseParams = {
      matchType: fixture.type,
      date: fixture.date,
      venue: fixture.venue,
      league: fixture.league
    };
  
    let params;
    if (fixture.type === 'NationalTeam') {
      params = {
        ...baseParams,
        homeCountry: fixture.homeTeam.team.country,
        awayCountry: fixture.awayTeam.team.country,
        homeTeam: fixture.homeTeam.team._id,
        awayTeam: fixture.awayTeam.team._id
      };
    } else {
      params = {
        ...baseParams,
        homeTeam: fixture.homeTeam.team._id,
        awayTeam: fixture.awayTeam.team._id
      };
    }
  
    const queryString = new URLSearchParams(params).toString();
    navigate(`/predict-match?${queryString}`);
  };

  if (error) return <div>Error while fetching fixtures</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="Search fixtures"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <Button onClick={() => navigate("/fixtures/add")}>Add Fixture</Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div>
          <FixturesTable
            fixtures={data.fixtures}
            setSortBy={setSortBy}
            setSortOrder={setSortOrder}
            sortOrder={sortOrder}
            handleAddMatch={handleAddMatch}
            handlePredictMatch={handlePredictMatch}
          />
        </div>
      )}

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
          disabled={(data && !data.totalPages) || page >= data?.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default FixturesPage;
