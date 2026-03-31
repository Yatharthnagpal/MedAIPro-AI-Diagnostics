import axios from 'axios';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : '/api';

const API = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new Event('medai:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const signup = async (email, password) => {
  return API.post('/auth/signup', { email, password });
};

export const login = async (email, password) => {
  return API.post('/auth/login', { email, password });
};

export const logout = async () => {
  return API.post('/auth/logout');
};

export const me = async () => {
  const res = await API.get('/auth/me');
  return res.data;
};

export const analyzeImage = async (moduleName, file, metadata = {}) => {
  const formData = new FormData();
  formData.append('module', moduleName);
  formData.append('image', file);
  
  // Add metadata (Age, Sex, etc.) if it exists
  Object.keys(metadata).forEach(key => {
    formData.append(key, metadata[key]);
  });

  try {
    const response = await API.post('/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const analyzeSepsis = async (vitals) => {
  try {
    const response = await API.post('/analyze/sepsis', vitals);
    return response.data;
  } catch (error) {
    console.error("Sepsis API Error:", error);
    throw error;
  }
};

export const getHistory = async () => {
  try {
    const response = await API.get('/history');
    return response.data;
  } catch (error) {
    console.error("History Error:", error);
    return [];
  }
};
