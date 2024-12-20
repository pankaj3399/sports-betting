import axios from 'axios';

const REACT_APP_API_URL = import.meta.env.VITE_REACT_APP_API_URL;

const instance = axios.create({
  baseURL: `${REACT_APP_API_URL}/api`,
});

export default instance;
