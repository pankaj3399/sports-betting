import axios from "../utils/axiosConfig";

export const fetchMatches = async ({page,search,teamName}) => {
  const { data } = await axios.get(
    `/match/matches?page=${page}&search=${search}&team=${teamName}`
  );
  return data;
};
