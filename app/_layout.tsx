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

const AUTH_KEY = 'cookit-auth';
const userDataKey = (userId: number) => `cookit-data-${userId}`;

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
      <Stack.Screen name="recipe/card/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="achievements" options={{ headerShown: false }} />
    </Stack>
  );
}

function StoreHydrator() {
  const store = useStore();
  const hydrated = useRef(false);

  // On mount: restore auth + user-specific data from localStorage
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let auth = webGet(AUTH_KEY);

    // Migrate from old format if needed
    if (!auth) {
      const old = webGet('cookit-store');
      if (old?.token && old?.user) {
        auth = { token: old.token, user: old.user };
        webSet(AUTH_KEY, auth);
        webSet(userDataKey(old.user.id), {
          cookedRecipes: old.cookedRecipes ?? [],
          cookedLogs: old.cookedLogs ?? [],
          savedRecipes: old.savedRecipes ?? [],
          shoppingList: old.shoppingList ?? [],
          userRatings: old.userRatings ?? {},
          notifications: old.notifications ?? [],
          earnedBadgeIds: old.earnedBadgeIds ?? [],
          pinnedBadgeIds: old.pinnedBadgeIds ?? [],
        });
        webRemove('cookit-store');
      }
    }

    if (!auth?.token || !auth?.user) return;
    store.setAuth(auth.user, auth.token);

    // Load user-specific data
    const userData = webGet(userDataKey(auth.user.id));
    if (userData) {
      useStore.setState({
        cookedRecipes: userData.cookedRecipes ?? [],
        cookedLogs: userData.cookedLogs ?? [],
        savedRecipes: userData.savedRecipes ?? [],
        shoppingList: userData.shoppingList ?? [],
        userRatings: userData.userRatings ?? {},
        notifications: userData.notifications ?? [],
        earnedBadgeIds: userData.earnedBadgeIds ?? [],
        pinnedBadgeIds: userData.pinnedBadgeIds ?? [],
      });
    }
    hydrated.current = true;
  }, []);

  const { token, user, cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds, pinnedBadgeIds } = store;

  // When user logs in (user.id changes), load their saved data from localStorage
  const prevUserIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!user?.id) { prevUserIdRef.current = null; return; }
    if (user.id === prevUserIdRef.current) return; // already loaded for this user
    prevUserIdRef.current = user.id;
    const userData = webGet(userDataKey(user.id));
    if (userData) {
      useStore.setState({
        cookedRecipes: userData.cookedRecipes ?? [],
        cookedLogs: userData.cookedLogs ?? [],
        savedRecipes: userData.savedRecipes ?? [],
        shoppingList: userData.shoppingList ?? [],
        userRatings: userData.userRatings ?? {},
        notifications: userData.notifications ?? [],
        earnedBadgeIds: userData.earnedBadgeIds ?? [],
        pinnedBadgeIds: userData.pinnedBadgeIds ?? [],
      });
    }
    hydrated.current = true;
  }, [user?.id]);

  // Persist state whenever it changes
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!hydrated.current && token === null) return;
    if (token && user) {
      webSet(AUTH_KEY, { token, user });
      webSet(userDataKey(user.id), { cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds, pinnedBadgeIds });
    } else {
      webRemove(AUTH_KEY);
    }
  }, [token, user, cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds, pinnedBadgeIds]);

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
