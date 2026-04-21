import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { FONTS } from '../constants/Fonts';
import { useStore } from '../store/useStore';

const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export default function CalendarScreen() {
  const router = useRouter();
  const { cookedLogs } = useStore();
  const cookedDateSet = new Set(cookedLogs.map((l) => l.date));

  const now = new Date();
  const currentYear = now.getFullYear();


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentYear}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {MONTH_NAMES.map((monthName, monthIdx) => {
          const firstDay = new Date(currentYear, monthIdx, 1).getDay();
          const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
          const isCurrentMonth = monthIdx === now.getMonth();

          const cells = [];
          for (let i = 0; i < firstDay; i++) {
            cells.push(<View key={`e-${i}`} style={styles.cell} />);
          }
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const cooked = cookedDateSet.has(dateStr);
            const isToday = isCurrentMonth && d === now.getDate();
            cells.push(
              <View key={d} style={[styles.cell, cooked && styles.cellCooked, isToday && !cooked && styles.cellToday]}>
                <Text style={[styles.cellText, cooked && styles.cellTextCooked, isToday && !cooked && styles.cellTextToday]}>
                  {d}
                </Text>
              </View>
            );
          }

          const cookedCount = cells.filter((_, i) => {
            const d = i - firstDay + 1;
            if (d < 1) return false;
            const dateStr = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            return cookedDateSet.has(dateStr);
          }).length;

          return (
            <View key={monthIdx} style={[styles.monthCard, isCurrentMonth && styles.monthCardCurrent]}>
              <View style={styles.monthHeader}>
                <Text style={[styles.monthName, isCurrentMonth && styles.monthNameCurrent]}>{monthName}</Text>
                {cookedCount > 0 && (
                  <View style={styles.cookedPill}>
                    <Ionicons name="flame" size={11} color={COLORS.star} />
                    <Text style={styles.cookedPillText}>{cookedCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.weekRow}>
                {WEEK_LABELS.map((d, i) => (
                  <Text key={i} style={styles.weekLabel}>{d}</Text>
                ))}
              </View>
              <View style={styles.grid}>{cells}</View>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

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
    fontSize: 18, fontWeight: '900', color: COLORS.text1,
    fontFamily: FONTS.titleBold, letterSpacing: -0.3,
  },

  scroll: { padding: 16, gap: 12 },

  monthCard: {
    backgroundColor: COLORS.surface1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  monthCardCurrent: {
    borderColor: COLORS.borderActive,
    borderWidth: 1.5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthName: { fontSize: 14, fontWeight: '800', color: COLORS.text2, fontFamily: FONTS.bodyBold },
  monthNameCurrent: { color: COLORS.primary },
  cookedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(217,119,6,0.12)',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)',
  },
  cookedPillText: { fontSize: 11, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },

  weekRow: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '700', color: COLORS.text3, fontFamily: FONTS.bodyBold },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellCooked: {},
  cellToday: {},
  cellText: { fontSize: 11, color: COLORS.text2, fontFamily: FONTS.body },
  cellTextCooked: {
    color: COLORS.star, fontWeight: '800', fontFamily: FONTS.bodyBold,
  },
  cellTextToday: { color: COLORS.primary, fontWeight: '800', fontFamily: FONTS.bodyBold },
});
