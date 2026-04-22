import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { FONTS } from '../constants/Fonts';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

export default function NotificationsScreen() {
  const router = useRouter();
  const t = useT();
  const n = t.notifications;
  const { token, notifications: localNotifs, markAllRead, language } = useStore();
  const [serverNotifs, setServerNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      api.getNotifications(token)
        .then(setServerNotifs)
        .catch(() => {})
        .finally(() => setLoading(false));
      // Mark local as read
      markAllRead();
      // Mark server as read
      api.markNotificationsRead(token).catch(() => {});
    }, [token])
  );

  // Merge: server notifs first, then local (badges/streaks)
  const allNotifs = [
    ...serverNotifs.map((n) => ({
      id: `srv-${n.id}`,
      type: n.type,
      title: n.title,
      message: n.message,
      icon: n.icon,
      color: n.color,
      read: !!n.read,
      createdAt: n.created_at,
      recipeId: n.recipe_id,
    })),
    ...localNotifs,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = allNotifs.filter((n) => !n.read).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return n.justNow;
    if (diffMins < 60) return n.minutesAgo(diffMins);
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return n.hoursAgo(diffHours);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return n.daysAgo(diffDays);
    return d.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-PT', { day: 'numeric', month: 'short' });
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{n.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : allNotifs.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>{n.emptyTitle}</Text>
          <Text style={styles.emptyText}>{n.emptyDesc}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {allNotifs.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.item, !n.read && styles.itemUnread]}
              activeOpacity={n.recipeId ? 0.7 : 1}
              onPress={() => n.recipeId && router.push(`/recipe/${n.recipeId}`)}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${n.color}18`, borderColor: `${n.color}35` }]}>
                <Ionicons name={n.icon as any} size={20} color={n.color} />
              </View>
              <View style={styles.itemBody}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.itemTime}>{formatDate(n.createdAt)}</Text>
                </View>
                <Text style={styles.itemMsg} numberOfLines={2}>{n.message}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,90,90,0.3)',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '800', color: COLORS.text1,
    fontFamily: FONTS.titleBold,
  },

  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  emptyText: { fontSize: 13, color: COLORS.text3, textAlign: 'center', lineHeight: 19, fontFamily: FONTS.body },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    backgroundColor: COLORS.surface1,
  },
  itemUnread: { backgroundColor: COLORS.primaryDim },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold, flex: 1 },
  itemTime: { fontSize: 11, color: COLORS.text3, fontFamily: FONTS.body, marginLeft: 6 },
  itemMsg: { fontSize: 13, color: COLORS.text2, lineHeight: 18, fontFamily: FONTS.body },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, flexShrink: 0,
  },
});
