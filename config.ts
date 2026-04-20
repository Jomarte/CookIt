import Constants from 'expo-constants';

// Em produção usa EXPO_PUBLIC_API_URL
// Em desenvolvimento usa o IP do computador (funciona em telemóvel real via Expo Go)
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:3001/api`;
