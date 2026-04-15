import { Redirect } from 'expo-router';
import { useStore } from '../store/useStore';

export default function Index() {
  const { token } = useStore();
  if (token) return <Redirect href="/(tabs)" />;
  return <Redirect href="/auth/login" />;
}
