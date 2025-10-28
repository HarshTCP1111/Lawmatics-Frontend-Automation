import axios from 'axios';

const API_BASE_URL = 'https://lawmatics-backend-692908019770.asia-south1.run.app/api';

export const sendOTP = async (email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/send-otp`, { email });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to send OTP');
  }
};

export const verifyOTP = async (email, otp) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/verify-otp`, { email, otp });
    // Store token in localStorage
    localStorage.setItem('authToken', response.data.token || 'authenticated');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Invalid OTP');
  }
};

export const verifyToken = async () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No token found');
  }
  // In a real app, you would verify the token with the backend
  return { valid: true };
};

export const logout = async () => {
  localStorage.removeItem('authToken');
  return { success: true };

};
