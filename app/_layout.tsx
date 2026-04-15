import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const STORAGE_KEY = 'cookit-store';

function webGet(key: string): any | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const str = localStorage.getItem(key);
    return str ? JSON.parse(str) : null;
  } catch { return null; }
}

function webSet(key: string, value: any) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
}

function webRemove(key: string) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {}
}

export const unstable_settings = {
  initialRouteName: 'index',
};

function AppStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/setup-profile" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="recipe/edit/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

function StoreHydrator() {
  const store = useStore();
  const hydrated = useRef(false);

  // On mount: restore full state from localStorage
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const saved = webGet(STORAGE_KEY);
    if (!saved) return;
    if (saved.token && saved.user) {
      store.setAuth(saved.user, saved.token);
    }
    if (saved.cookedRecipes) {
      // Restore via individual setters via store internals
      useStore.setState({
        cookedRecipes: saved.cookedRecipes ?? [],
        cookedLogs: saved.cookedLogs ?? [],
        savedRecipes: saved.savedRecipes ?? [],
        shoppingList: saved.shoppingList ?? [],
        userRatings: saved.userRatings ?? {},
        notifications: saved.notifications ?? [],
        earnedBadgeIds: saved.earnedBadgeIds ?? [],
      });
    }
    hydrated.current = true;
  }, []);

  // Persist state whenever it changes
  const { token, user, cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds } = store;
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (token === null && !hydrated.current) return;
    if (token) {
      webSet(STORAGE_KEY, { token, user, cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds });
    } else {
      webRemove(STORAGE_KEY);
    }
  }, [token, user, cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    PlayfairDisplay_900Black,
    Lato_400Regular,
    Lato_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webPhone}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <StoreHydrator />
            <AppStack />
          </SafeAreaProvider>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StoreHydrator />
      <AppStack />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh' as any,
  },
  webPhone: {
    width: 390,
    height: 844,
    overflow: 'hidden',
    borderRadius: 44,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
});
