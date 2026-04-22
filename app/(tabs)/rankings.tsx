import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BestRecipe {
  id: string;
  title: string;
  difficulty: string;
  totalTime: number;
  dishType?: string;
}

interface Cook {
  id: string;
  rank: number;
  name: string;
  username: string;
  avatar: string | null;
  nationality: string | null;
  cookingType: string;
  averageRating: number;
  totalRatingsCount: number;
  recipeCount: number;
  score: number;
  bestRecipe: BestRecipe | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.red,
};

const DISH_ICONS: Record<string, string> = {
  'Prato Principal': 'restaurant-outline',
  'Massa': 'restaurant-outline',
  'Sopa': 'cafe-outline',
  'Street Food': 'fast-food-outline',
  'Sobremesa': 'ice-cream-outline',
  'Grelhados': 'flame-outline',
  'Pizza': 'pizza-outline',
  'Entrada': 'nutrition-outline',
  'Peixe': 'fish-outline',
};

const PODIUM_COLORS = {
  1: { bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.45)', text: '#FFB800', glow: 'rgba(255,184,0,0.3)' },
  2: { bg: 'rgba(160,160,192,0.10)', border: 'rgba(160,160,192,0.35)', text: '#C0C0D0', glow: 'rgba(160,160,192,0.2)' },
  3: { bg: 'rgba(205,127,50,0.10)', border: 'rgba(205,127,50,0.35)', text: '#CD7F32', glow: 'rgba(205,127,50,0.2)' },
} as Record<number, { bg: string; border: string; text: string; glow: string }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chefTitle(name: string) {
  const first = name.split(' ')[0];
  return first.toLowerCase().endsWith('a') ? 'Cozinheira' : 'Cozinheiro';
}

function nationalityToCode(nationality: string | null): string | null {
  if (!nationality) return null;
  const map: Record<string, string> = {
    'portuguesa': 'pt', 'português': 'pt', 'portugal': 'pt',
    'brasileira': 'br', 'brasileiro': 'br', 'brasil': 'br',
    'italiana': 'it', 'italiano': 'it', 'itália': 'it',
    'francesa': 'fr', 'francês': 'fr', 'france': 'fr',
    'espanhola': 'es', 'espanhol': 'es', 'espanha': 'es',
    'inglesa': 'gb', 'inglês': 'gb', 'inglaterra': 'gb',
    'americana': 'us', 'americano': 'us', 'eua': 'us',
    'japonesa': 'jp', 'japonês': 'jp', 'japão': 'jp',
    'chinesa': 'cn', 'chinês': 'cn', 'china': 'cn',
    'indiana': 'in', 'indiano': 'in', 'índia': 'in',
    'mexicana': 'mx', 'mexicano': 'mx', 'méxico': 'mx',
    'alemã': 'de', 'alemão': 'de', 'alemanha': 'de',
  };
  const code = map[nationality.toLowerCase()];
  if (code) return code;
  if (/^[a-z]{2}$/.test(nationality.toLowerCase())) return nationality.toLowerCase();
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonBlock({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) {
  return <View style={{ width: w as any, height: h, borderRadius: radius, backgroundColor: COLORS.surface2 }} />;
}

function LoadingSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.skeletonWrap} showsVerticalScrollIndicator={false}>
      <View style={styles.podiumRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.podiumSlot, i === 1 ? styles.podiumCenter : styles.podiumSide]}>
            <SkeletonBlock w={i === 1 ? 88 : 72} h={i === 1 ? 88 : 72} radius={44} />
            <SkeletonBlock w={64} h={10} radius={5} />
            <SkeletonBlock w={50} h={8} radius={4} />
          </View>
        ))}
      </View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.listCard, { gap: 10 }]}>
          <SkeletonBlock w={32} h={14} radius={4} />
          <SkeletonBlock w={44} h={44} radius={22} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock w="70%" h={12} radius={4} />
            <SkeletonBlock w="50%" h={10} radius={4} />
          </View>
          <SkeletonBlock w={48} h={20} radius={8} />
        </View>
      ))}
    </ScrollView>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <View style={styles.starRow}>
      <Ionicons name="star" size={12} color={COLORS.star} />
      <Text style={styles.starText}>{value > 0 ? value.toFixed(1) : '—'}</Text>
    </View>
  );
}

function RecipeMiniCard({ recipe }: { recipe: BestRecipe }) {
  const diffColor = DIFF_COLORS[recipe.difficulty] ?? COLORS.text2;
  const dishIcon = (recipe.dishType ? DISH_ICONS[recipe.dishType] : null) ?? 'restaurant-outline';
  return (
    <View style={styles.miniCard}>
      <Ionicons name={dishIcon as any} size={13} color={COLORS.text3} />
      <Text style={styles.miniCardTitle} numberOfLines={1}>{recipe.title}</Text>
      <View style={[styles.miniDiffDot, { backgroundColor: diffColor }]} />
    </View>
  );
}

function CookAvatar({ cook, size, textSize, borderColor, bgColor }: {
  cook: Cook; size: number; textSize: number; borderColor: string; bgColor: string;
}) {
  const initial = cook.name[0].toUpperCase();
  return (
    <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2, borderColor, backgroundColor: bgColor }]}>
      {cook.avatar
        ? <Image source={{ uri: cook.avatar }} style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }} />
        : <Text style={[styles.avatarLetter, { fontSize: textSize, color: borderColor }]}>{initial}</Text>
      }
    </View>
  );
}

function PodiumCard({ cook, position }: { cook: Cook; position: 1 | 2 | 3 }) {
  const pc = PODIUM_COLORS[position];
  const isCenter = position === 1;
  const avatarSize = isCenter ? 80 : 64;
  const flagCode = nationalityToCode(cook.nationality);
  const medalIcon = position === 1 ? 'trophy' : 'medal-outline';
  const medalLabel = ['', '1º', '2º', '3º'][position];

  return (
    <View style={[styles.podiumSlot, isCenter ? styles.podiumCenter : styles.podiumSide]}>
      <View style={[styles.medalBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
        <Ionicons name={medalIcon as any} size={isCenter ? 16 : 13} color={pc.text} />
        <Text style={[styles.medalLabel, { color: pc.text }]}>{medalLabel}</Text>
      </View>

      <View style={{ position: 'relative' }}>
        <CookAvatar cook={cook} size={avatarSize} textSize={isCenter ? 30 : 22} borderColor={pc.border} bgColor={pc.bg} />
        {flagCode && (
          <Image
            source={{ uri: `https://flagcdn.com/w40/${flagCode}.png` }}
            style={[styles.podiumFlag, isCenter && styles.podiumFlagCenter]}
          />
        )}
      </View>

      <Text style={[styles.podiumName, isCenter && styles.podiumNameCenter]} numberOfLines={1}>
        {chefTitle(cook.name)} {cook.name.split(' ')[0]}
      </Text>
      <StarRating value={cook.averageRating} />
      {cook.bestRecipe && <RecipeMiniCard recipe={cook.bestRecipe} />}
    </View>
  );
}

function ListRow({ cook }: { cook: Cook }) {
  const flagCode = nationalityToCode(cook.nationality);
  return (
    <View style={styles.listCard}>
      <Text style={styles.listRank}>#{cook.rank}</Text>

      <View style={styles.listAvatarWrap}>
        {cook.avatar
          ? <Image source={{ uri: cook.avatar }} style={styles.listAvatarImg} />
          : <Text style={styles.listAvatarLetter}>{cook.name[0].toUpperCase()}</Text>
        }
      </View>

      <View style={styles.listInfo}>
        <View style={styles.listNameRow}>
          <Text style={styles.listName} numberOfLines={1}>{chefTitle(cook.name)} {cook.name.split(' ')[0]}</Text>
          {flagCode && <Image source={{ uri: `https://flagcdn.com/w40/${flagCode}.png` }} style={styles.listFlag} />}
        </View>
        <Text style={styles.listSpecialty} numberOfLines={1}>{cook.cookingType}</Text>
        {cook.bestRecipe && <RecipeMiniCard recipe={cook.bestRecipe} />}
      </View>

      <View style={styles.listRatingWrap}>
        <StarRating value={cook.averageRating} />
        {cook.totalRatingsCount > 0 && (
          <Text style={styles.listRatingCount}>{cook.totalRatingsCount} av.</Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RankingsScreen() {
  const [cooks, setCooks] = useState<Cook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getRankings();
      setCooks(data);
    } catch {}
    if (refresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const top3 = cooks.slice(0, 3) as (Cook & { rank: 1 | 2 | 3 })[];
  const rest = cooks.slice(3);
  const podiumOrder: Array<0 | 1 | 2> = [1, 0, 2];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkC}>C</Text>
          <Text style={styles.wordmarkK}>K</Text>
        </View>
      </View>

      {loading ? (
        <LoadingSkeleton />
      ) : cooks.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="trophy-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Ainda sem rankings</Text>
          <Text style={styles.emptyText}>Publica receitas e recebe avaliações para aparecer aqui.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
        >
          {top3.length >= 2 && (
            <View style={styles.podiumSection}>
              <View style={styles.podiumRow}>
                {podiumOrder.map((idx) => {
                  const cook = top3[idx];
                  if (!cook) return null;
                  return <PodiumCard key={cook.id} cook={cook} position={cook.rank as 1 | 2 | 3} />;
                })}
              </View>
            </View>
          )}

          {top3.length < 2 && top3.length > 0 && (
            <View style={styles.partialPodium}>
              {top3.map((cook) => <ListRow key={cook.id} cook={cook} />)}
            </View>
          )}

          {rest.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.listSectionTitle}>Classificação</Text>
              {rest.map((cook) => <ListRow key={cook.id} cook={cook} />)}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bg, gap: 8,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  wordmarkC: { fontSize: 28, fontWeight: '900', color: COLORS.text1, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  wordmarkK: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1, fontFamily: FONTS.titleBlack },

  feedContent: { paddingBottom: 32 },

  podiumSection: { paddingTop: 20, paddingBottom: 4, paddingHorizontal: 8 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  podiumSlot: { alignItems: 'center', gap: 5 },
  podiumCenter: { flex: 1, zIndex: 2 },
  podiumSide: { flex: 1, marginBottom: 36 },

  medalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, marginBottom: 4,
  },
  medalLabel: { fontSize: 11, fontWeight: '800', fontFamily: FONTS.bodyBold },

  avatarWrap: { borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarLetter: { fontWeight: '900', fontFamily: FONTS.titleBlack },

  podiumFlag: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 14, borderRadius: 3,
    borderWidth: 1, borderColor: COLORS.bg,
  },
  podiumFlagCenter: { width: 24, height: 17 },
  podiumName: { fontSize: 13, fontWeight: '800', color: COLORS.text1, marginTop: 2, fontFamily: FONTS.bodyBold },
  podiumNameCenter: { fontSize: 15 },

  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  starText: { fontSize: 12, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },

  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface2, paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    marginTop: 3, maxWidth: 130,
  },
  miniCardTitle: { flex: 1, fontSize: 10, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },
  miniDiffDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },

  partialPodium: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  listSection: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  listSectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.text3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2, fontFamily: FONTS.bodyBold,
  },

  listCard: {
    backgroundColor: COLORS.surface1, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  listRank: { fontSize: 13, fontWeight: '900', color: COLORS.text3, width: 28, textAlign: 'center', flexShrink: 0, fontFamily: FONTS.bodyBold },
  listAvatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryDim, borderWidth: 1.5, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
  },
  listAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  listAvatarLetter: { fontSize: 18, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.titleBold },
  listInfo: { flex: 1, gap: 2 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listName: { fontSize: 14, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  listFlag: { width: 20, height: 14, borderRadius: 3 },
  listSpecialty: { fontSize: 12, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },
  listRatingWrap: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  listRatingCount: { fontSize: 10, color: COLORS.text3, fontWeight: '600', fontFamily: FONTS.body },

  skeletonWrap: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.body },
});
