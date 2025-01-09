import axios from '../utils/axiosConfig';

export const savePlayerData = async (playerData) => {
    const { data } = await axios.post(`/player`, playerData);
    return data;
}

export const getAllPlayers = async ({page,search,sortBy,sortOrder}) => {
    const { data } = await axios.get(`/player/players?page=${page}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
    return data;
}