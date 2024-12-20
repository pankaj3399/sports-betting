import axios from '../utils/axiosConfig';

export const getPositions = async () => {
    const { data } = await axios.get(`/position`);
    return data;
}
