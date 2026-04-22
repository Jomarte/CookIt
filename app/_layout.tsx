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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

SplashScreen.preventAutoHideAsync();

const AUTH_KEY = 'cookit-auth';
const userDataKey = (userId: number) => `cookit-data-${userId}`;

async function storageGet(key: string): Promise<any | null> {
  try {
    const str = await AsyncStorage.getItem(key);
    return str ? JSON.parse(str) : null;
  } catch { return null; }
}

async function storageSet(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function storageRemove(key: string) {
  try {
    await AsyncStorage.removeItem(key);
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
      <Stack.Screen name="recipe/card/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="achievements" options={{ headerShown: false }} />
    </Stack>
  );
}

async function syncFromServer(token: string) {
  try {
    const [saved, cooked, ratings] = await Promise.all([
      api.getSavedRecipes(token),
      api.getCookedRecipes(token),
      api.getUserRatings(token),
    ]);
    useStore.setState({
      savedRecipes: saved,
      cookedRecipes: cooked.map(c => c.recipeId),
      cookedLogs: cooked,
      userRatings: ratings,
    });
  } catch {}
}

function StoreHydrator() {
  const store = useStore();
  const hydrated = useRef(false);
  const prevUserIdRef = useRef<number | null>(null);

  // On mount: restore auth, then sync server data + local-only data
  useEffect(() => {
    async function load() {
      let auth = await storageGet(AUTH_KEY);

      // Migrate from old format if needed
      if (!auth) {
        const old = await storageGet('cookit-store');
        if (old?.token && old?.user) {
          auth = { token: old.token, user: old.user };
          await storageSet(AUTH_KEY, auth);
          await storageRemove('cookit-store');
        }
      }

      if (!auth?.token || !auth?.user) return;
      store.setAuth(auth.user, auth.token);

      // Load local-only data (shopping list, badges, notifications, ratings backup)
      const userData = await storageGet(userDataKey(auth.user.id));
      if (userData) {
        useStore.setState({
          shoppingList: userData.shoppingList ?? [],
          earnedBadgeIds: userData.earnedBadgeIds ?? [],
          pinnedBadgeIds: userData.pinnedBadgeIds ?? [],
          notifications: userData.notifications ?? [],
          userRatings: userData.userRatings ?? {},
        });
      }

      // Sync server data (saved, cooked, ratings)
      await syncFromServer(auth.token);
      hydrated.current = true;
    }
    load();
  }, []);

  const { token, user, shoppingList, earnedBadgeIds, pinnedBadgeIds, notifications, userRatings } = store;

  // When user logs in manually (user.id changes), sync from server
  useEffect(() => {
    if (!user?.id) { prevUserIdRef.current = null; return; }
    if (user.id === prevUserIdRef.current) return;
    prevUserIdRef.current = user.id;

    async function loadUser() {
      const userData = await storageGet(userDataKey(user!.id));
      if (userData) {
        useStore.setState({
          shoppingList: userData.shoppingList ?? [],
          earnedBadgeIds: userData.earnedBadgeIds ?? [],
          pinnedBadgeIds: userData.pinnedBadgeIds ?? [],
          notifications: userData.notifications ?? [],
          userRatings: userData.userRatings ?? {},
        });
      }
      if (token) await syncFromServer(token);
      hydrated.current = true;
    }
    loadUser();
  }, [user?.id]);

  // Persist local-only data
  useEffect(() => {
    if (!hydrated.current) return;
    if (token && user) {
      storageSet(AUTH_KEY, { token, user });
      storageSet(userDataKey(user.id), { shoppingList, earnedBadgeIds, pinnedBadgeIds, notifications, userRatings });
    } else {
      storageRemove(AUTH_KEY);
    }
  }, [token, user, shoppingList, earnedBadgeIds, pinnedBadgeIds, notifications, userRatings]);

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
