import axios from '../utils/axiosConfig';

export const getCountries = async () => {
    const { data } = await axios.get(`/country`);
    return data;
}

export const getNationalTeams = async (country) => {
    const { data } = await axios.get(`/country/national-teams?country=${country}`);
    return data;
}
export const getNationalTeamPlayers = async (teamId, date) => {
    const encodedDate = date ? `?date=${encodeURIComponent(date)}` : '';
    const { data } = await axios.get(`/country/national-teams/${teamId}/players${encodedDate}`);
    return data;
}