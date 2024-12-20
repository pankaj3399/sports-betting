import axios from '../utils/axiosConfig';

export const getClubs = async ({page, search}) => {
    const { data } = await axios.get(`/club?page=${page}&search=${search}`);
    return data;
}   

export const getActiveClubs = async () => {
    const { data } = await axios.get(`/club/active`);
    return data;
}

export const editClub = async ({id, name}) => {
    const { data } = await axios.put(`/club/${id}`, {name});
    return data;
}

export const deleteClub = async (id) => {
    const { data } = await axios.delete(`/club/${id}`);
    return data;
}

export const addClub = async ({name}) => {
    const { data } = await axios.post(`/club`, {name});
    return data;
}

export const getClubPlayers = async (clubId, date = null) => {
    let url = `/club/${clubId}/players`;
    if (date) {
        url += `?date=${date}`;
    }
    const { data } = await axios.get(url);
    return data;
};
