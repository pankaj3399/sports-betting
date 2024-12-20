import axios from '../utils/axiosConfig';

export const savePlayerData = async (playerData) => {
    const { data } = await axios.post(`/player`, playerData);
    return data;
}