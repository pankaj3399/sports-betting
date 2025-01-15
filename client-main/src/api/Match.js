import axios from "../utils/axiosConfig";

export const fetchMatches = async ({page,search,teamName,playerId}) => {
  const { data } = await axios.get(
    `/match/matches?page=${page}&search=${search}&team=${teamName}&playerId=${playerId}`
  );
  return data;
};
