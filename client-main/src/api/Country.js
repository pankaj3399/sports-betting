import axios from "../utils/axiosConfig";

export const getCountries = async () => {
  const { data } = await axios.get(`/country`);
  return data;
};

export const getNationalTeams = async (country) => {
  const { data } = await axios.get(
    `/country/national-teams?country=${country}`
  );
  return data;
};

export const getAllNationalTeams = async ({ page, sortBy, sortOrder, search }) => {
  const { data } = await axios.get(
    `/country/national-teams/all?page=${page}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  );
  return data;
};

export const getActiveTeams = async () => {
  const { data } = await axios.get(`/country/active/teams`);
  return data;
}


export const getNationalTeamPlayers = async (teamId, date) => {
  const encodedDate = date ? `?date=${encodeURIComponent(date)}` : "";
  const { data } = await axios.get(
    `/country/national-teams/${teamId}/players${encodedDate}`
  );
  return data;
};
