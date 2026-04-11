import axios from 'axios';
import { API_BASE } from './config';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flowsynqToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Port Geocoding API
export const getPortCoordinates = async (portName) => {
  try {
    const response = await api.get('/port-geocoding/coordinates', {
      params: { portName: portName }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching port coordinates:', error);
    throw error;
  }
};




// Marine Route API
export const calculateMarineRoute = async (originPort, destinationPort) => {
  try {
    const response = await api.post('/marine-route/calculate', {
      originPort,
      destinationPort,
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating marine route:', error);
    throw error;
  }
};
