import axios from "../utils/axiosConfig";

export const fetchMatches = async ({page,search,teamName,playerId}) => {
  const { data } = await axios.get(
    `/match/matches?page=${page}&search=${search}&team=${teamName}&playerId=${playerId}`
  );
  return data;
};


export const deleteMatch = async (matchId) => {
  const { data } = await axios.delete(`/match/delete-match?matchId=${matchId}`);
  return data;
}

export const deleteOldMatches = async () => {
  const { data } = await axios.delete(`/match/delete-old-matches`);
  return data;
}