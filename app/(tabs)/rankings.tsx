import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface BestRecipe {
  id: string;
  title: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  totalTime: number;
  dishType?: string;
}

interface Cook {
  id: string;
  rank: number;
  username: string;
  name: string;
  specialty: string;
  cuisine: string;
  nationality: string;
  averageRating: number;
  totalRatingsCount: number;
  bestRecipe: BestRecipe;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ALL_COOKS: Cook[] = [
  {
    id: '1', rank: 1, username: 'chef_ana', name: 'Ana Rodrigues',
    specialty: 'Assados & Arrozes', cuisine: 'Portuguesa', nationality: 'pt',
    averageRating: 4.9, totalRatingsCount: 312,
    bestRecipe: { id: 'r1', title: 'Arroz de Pato da Avó', difficulty: 'Médio', totalTime: 75, dishType: 'Prato Principal' },
  },
  {
    id: '2', rank: 2, username: 'marco_cozinha', name: 'Marco Silva',
    specialty: 'Pastas Artesanais', cuisine: 'Italiana', nationality: 'it',
    averageRating: 4.8, totalRatingsCount: 276,
    bestRecipe: { id: 'r2', title: 'Tagliatelle al Ragù', difficulty: 'Médio', totalTime: 90, dishType: 'Massa' },
  },
  {
    id: '3', rank: 3, username: 'sushi_miguel', name: 'Miguel Tanaka',
    specialty: 'Sushi & Ramen', cuisine: 'Japonesa', nationality: 'jp',
    averageRating: 4.8, totalRatingsCount: 198,
    bestRecipe: { id: 'r3', title: 'Tonkotsu Ramen', difficulty: 'Difícil', totalTime: 240, dishType: 'Sopa' },
  },
  {
    id: '4', rank: 4, username: 'tacos_lucia', name: 'Lúcia Mendez',
    specialty: 'Street Food', cuisine: 'Mexicana', nationality: 'mx',
    averageRating: 4.7, totalRatingsCount: 154,
    bestRecipe: { id: 'r4', title: 'Tacos al Pastor', difficulty: 'Fácil', totalTime: 35, dishType: 'Street Food' },
  },
  {
    id: '5', rank: 5, username: 'spice_raj', name: 'Raj Patel',
    specialty: 'Especiarias & Curry', cuisine: 'Indiana', nationality: 'in',
    averageRating: 4.7, totalRatingsCount: 143,
    bestRecipe: { id: 'r5', title: 'Butter Chicken Masala', difficulty: 'Médio', totalTime: 55, dishType: 'Prato Principal' },
  },
  {
    id: '6', rank: 6, username: 'bistro_claire', name: 'Claire Dubois',
    specialty: 'Pâtisserie', cuisine: 'Francesa', nationality: 'fr',
    averageRating: 4.6, totalRatingsCount: 129,
    bestRecipe: { id: 'r6', title: 'Crème Brûlée Clássico', difficulty: 'Médio', totalTime: 50, dishType: 'Sobremesa' },
  },
  {
    id: '7', rank: 7, username: 'dim_sum_wei', name: 'Wei Chen',
    specialty: 'Dim Sum & Wok', cuisine: 'Chinesa', nationality: 'cn',
    averageRating: 4.6, totalRatingsCount: 117,
    bestRecipe: { id: 'r7', title: 'Pato Laqueado Pequim', difficulty: 'Difícil', totalTime: 180, dishType: 'Prato Principal' },
  },
  {
    id: '8', rank: 8, username: 'carne_carlos', name: 'Carlos Ferreira',
    specialty: 'Churrasco', cuisine: 'Brasileira', nationality: 'br',
    averageRating: 4.5, totalRatingsCount: 98,
    bestRecipe: { id: 'r8', title: 'Picanha na Brasa', difficulty: 'Fácil', totalTime: 40, dishType: 'Grelhados' },
  },
  {
    id: '9', rank: 9, username: 'bacalhau_ze', name: 'José Oliveira',
    specialty: 'Bacalhau & Grelhados', cuisine: 'Portuguesa', nationality: 'pt',
    averageRating: 4.5, totalRatingsCount: 87,
    bestRecipe: { id: 'r9', title: 'Bacalhau à Brás', difficulty: 'Fácil', totalTime: 30, dishType: 'Peixe' },
  },
  {
    id: '10', rank: 10, username: 'pizza_sofia', name: 'Sofia Romano',
    specialty: 'Pizza Napolitana', cuisine: 'Italiana', nationality: 'it',
    averageRating: 4.4, totalRatingsCount: 76,
    bestRecipe: { id: 'r10', title: 'Margherita DOC', difficulty: 'Médio', totalTime: 45, dishType: 'Pizza' },
  },
  {
    id: '11', rank: 11, username: 'ramen_yuki', name: 'Yuki Sato',
    specialty: 'Noodles & Gyoza', cuisine: 'Japonesa', nationality: 'jp',
    averageRating: 4.4, totalRatingsCount: 65,
    bestRecipe: { id: 'r11', title: 'Gyoza de Frango', difficulty: 'Médio', totalTime: 60, dishType: 'Entrada' },
  },
  {
    id: '12', rank: 12, username: 'mole_elena', name: 'Elena Vargas',
    specialty: 'Mole & Enchiladas', cuisine: 'Mexicana', nationality: 'mx',
    averageRating: 4.3, totalRatingsCount: 54,
    bestRecipe: { id: 'r12', title: 'Mole Poblano', difficulty: 'Difícil', totalTime: 120, dishType: 'Prato Principal' },
  },
];

const CUISINES = ['Global', 'Portuguesa', 'Italiana', 'Japonesa', 'Mexicana', 'Indiana', 'Francesa', 'Chinesa', 'Brasileira'];

const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.red,
};

const DISH_ICONS: Record<string, string> = {
  'Prato Principal': 'restaurant-outline',
  'Massa':           'restaurant-outline',
  'Sopa':            'cafe-outline',
  'Street Food':     'fast-food-outline',
  'Sobremesa':       'ice-cream-outline',
  'Grelhados':       'flame-outline',
  'Pizza':           'pizza-outline',
  'Entrada':         'nutrition-outline',
  'Peixe':           'fish-outline',
};

const PODIUM_COLORS = {
  1: { bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.45)', text: '#FFB800', glow: 'rgba(255,184,0,0.3)' },
  2: { bg: 'rgba(160,160,192,0.10)', border: 'rgba(160,160,192,0.35)', text: '#C0C0D0', glow: 'rgba(160,160,192,0.2)' },
  3: { bg: 'rgba(205,127,50,0.10)', border: 'rgba(205,127,50,0.35)', text: '#CD7F32', glow: 'rgba(205,127,50,0.2)' },
} as Record<number, { bg: string; border: string; text: string; glow: string }>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonBlock({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) {
  return (
    <View style={{ width: w as any, height: h, borderRadius: radius, backgroundColor: COLORS.surface2 }} />
  );
}

function LoadingSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.skeletonWrap} showsVerticalScrollIndicator={false}>
      {/* Podium skeleton */}
      <View style={styles.podiumRow}>
        <View style={[styles.podiumSlot, styles.podiumSide]}>
          <SkeletonBlock w={72} h={72} radius={36} />
          <SkeletonBlock w={64} h={10} radius={5} />
          <SkeletonBlock w={50} h={8} radius={4} />
        </View>
        <View style={[styles.podiumSlot, styles.podiumCenter]}>
          <SkeletonBlock w={88} h={88} radius={44} />
          <SkeletonBlock w={80} h={11} radius={5} />
          <SkeletonBlock w={60} h={8} radius={4} />
        </View>
        <View style={[styles.podiumSlot, styles.podiumSide]}>
          <SkeletonBlock w={72} h={72} radius={36} />
          <SkeletonBlock w={64} h={10} radius={5} />
          <SkeletonBlock w={50} h={8} radius={4} />
        </View>
      </View>
      {/* List skeleton */}
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
      <Text style={styles.starText}>{value.toFixed(1)}</Text>
    </View>
  );
}

function chefTitle(name: string) {
  const first = name.split(' ')[0];
  return first.toLowerCase().endsWith('a') ? 'Cozinheira' : 'Cozinheiro';
}

function RecipeMiniCard({ recipe }: { recipe: BestRecipe }) {
  const diffColor = DIFF_COLORS[recipe.difficulty] ?? COLORS.text2;
  const dishIcon = (recipe.dishType ? DISH_ICONS[recipe.dishType] : null) ?? 'restaurant-outline';
  return (
    <View style={styles.miniCard}>
      <Ionicons name={dishIcon as any} size={13} color={COLORS.text3} />
      <Text style={styles.miniCardTitle}>{recipe.title}</Text>
      <View style={[styles.miniDiffDot, { backgroundColor: diffColor }]} />
    </View>
  );
}

function PodiumCard({ cook, position }: { cook: Cook; position: 1 | 2 | 3 }) {
  const pc = PODIUM_COLORS[position];
  const isCenter = position === 1;
  const avatarSize = isCenter ? 80 : 64;
  const initial = cook.name[0].toUpperCase();

  const medalIcon = position === 1 ? 'trophy' : 'medal-outline';
  const medalLabel = ['', '1º', '2º', '3º'][position];

  return (
    <View style={[styles.podiumSlot, isCenter ? styles.podiumCenter : styles.podiumSide]}>
      {/* Crown/medal */}
      <View style={[styles.medalBadge, { backgroundColor: pc.bg, borderColor: pc.border }]}>
        <Ionicons name={medalIcon as any} size={isCenter ? 16 : 13} color={pc.text} />
        <Text style={[styles.medalLabel, { color: pc.text }]}>{medalLabel}</Text>
      </View>

      {/* Avatar */}
      <View style={{ position: 'relative' }}>
        <View
          style={[
            styles.podiumAvatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: pc.bg,
              borderColor: pc.border,
              shadowColor: pc.glow,
            },
            isCenter && styles.podiumAvatarCenter,
          ]}
        >
          <Text style={[styles.podiumAvatarLetter, { fontSize: isCenter ? 30 : 22, color: pc.text }]}>
            {initial}
          </Text>
        </View>
        <Image
          source={{ uri: `https://flagcdn.com/w40/${cook.nationality}.png` }}
          style={[styles.podiumFlag, isCenter && styles.podiumFlagCenter]}
        />
      </View>

      <Text style={[styles.podiumName, isCenter && styles.podiumNameCenter]} numberOfLines={1}>
        {chefTitle(cook.name)} {cook.name.split(' ')[0]}
      </Text>

      <StarRating value={cook.averageRating} />

      <RecipeMiniCard recipe={cook.bestRecipe} />

    </View>
  );
}

function ListRow({ cook }: { cook: Cook }) {
  const initial = cook.name[0].toUpperCase();
  return (
    <View style={styles.listCard}>
      <Text style={styles.listRank}>#{cook.rank}</Text>

      <View style={styles.listAvatar}>
        <Text style={styles.listAvatarLetter}>{initial}</Text>
      </View>

      <View style={styles.listInfo}>
        <View style={styles.listNameRow}>
          <Text style={styles.listName} numberOfLines={1}>{chefTitle(cook.name)} {cook.name.split(' ')[0]}</Text>
          <Image
            source={{ uri: `https://flagcdn.com/w40/${cook.nationality}.png` }}
            style={styles.listFlag}
          />
        </View>
        <Text style={styles.listSpecialty} numberOfLines={1}>{cook.specialty}</Text>
        <RecipeMiniCard recipe={cook.bestRecipe} />
      </View>

      <View style={styles.listRatingWrap}>
        <StarRating value={cook.averageRating} />
        <Text style={styles.listRatingCount}>{cook.totalRatingsCount} av.</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RankingsScreen() {
  const [activeCuisine, setActiveCuisine] = useState('Global');
  const [loading] = useState(false);

  const filtered = useMemo(() => {
    const base = activeCuisine === 'Global'
      ? ALL_COOKS
      : ALL_COOKS.filter((c) => c.cuisine === activeCuisine);

    // Re-rank after filter
    return base.map((c, i) => ({ ...c, rank: i + 1 }));
  }, [activeCuisine]);

  const top3 = filtered.slice(0, 3) as (Cook & { rank: 1 | 2 | 3 })[];
  const rest = filtered.slice(3);

  const podiumOrder: Array<0 | 1 | 2> = [1, 0, 2]; // #2 left, #1 center, #3 right

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkC}>C</Text>
          <Text style={styles.wordmarkK}>K</Text>
        </View>
      </View>

      {/* Cuisine chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {CUISINES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, activeCuisine === c && styles.chipActive]}
            onPress={() => setActiveCuisine(c)}
          >
            <Text style={[styles.chipText, activeCuisine === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="trophy-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sem dados</Text>
          <Text style={styles.emptyText}>Ainda não há cozinheiros nesta categoria.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedContent}
        >
          {/* ── Podium ── */}
          {top3.length === 3 && (
            <View style={styles.podiumSection}>
              <View style={styles.podiumRow}>
                {podiumOrder.map((idx) => {
                  const cook = top3[idx];
                  return (
                    <PodiumCard
                      key={cook.id}
                      cook={cook}
                      position={cook.rank as 1 | 2 | 3}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Partial top (1 or 2 cooks) */}
          {top3.length < 3 && top3.length > 0 && (
            <View style={styles.partialPodium}>
              {top3.map((cook) => (
                <ListRow key={cook.id} cook={cook} />
              ))}
            </View>
          )}

          {/* ── List (rank 4+) ── */}
          {rest.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.listSectionTitle}>Classificação</Text>
              {rest.map((cook) => (
                <ListRow key={cook.id} cook={cook} />
              ))}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
    gap: 8,
  },
  headerIcon: { marginRight: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text1, letterSpacing: -0.3, flex: 1, fontFamily: FONTS.titleBold },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  wordmarkC: { fontSize: 28, fontWeight: '900', color: COLORS.text1, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  wordmarkK: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  headerSub: { fontSize: 12, color: COLORS.text3, fontWeight: '600', fontFamily: FONTS.body },

  // Cuisine chips
  chipsScroll: { flexShrink: 0, maxHeight: 48 },
  chipsContent: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  chipTextActive: { color: COLORS.primary },

  feedContent: { paddingBottom: 32 },

  // Podium section
  podiumSection: {
    paddingTop: 20,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  podiumSlot: {
    alignItems: 'center',
    gap: 5,
  },
  podiumCenter: {
    flex: 1,
    zIndex: 2,
    paddingBottom: 0,
    marginBottom: 0,
  },
  podiumSide: {
    flex: 1,
    marginBottom: 36,
  },

  medalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  medalLabel: { fontSize: 11, fontWeight: '800', fontFamily: FONTS.bodyBold },

  podiumAvatar: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  podiumAvatarCenter: {
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  podiumAvatarLetter: { fontWeight: '900', fontFamily: FONTS.titleBlack },

  podiumFlag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.bg,
  },
  podiumFlagCenter: { width: 24, height: 17 },

  podiumName: { fontSize: 13, fontWeight: '800', color: COLORS.text1, marginTop: 2, fontFamily: FONTS.bodyBold },
  podiumNameCenter: { fontSize: 15 },
  podiumUsername: { fontSize: 11, color: COLORS.text3, marginTop: -2, fontFamily: FONTS.body },

  podiumBase: {
    alignSelf: 'stretch',
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  podiumBaseText: { fontSize: 13, fontWeight: '900', fontFamily: FONTS.titleBlack },

  // Star rating
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  starText: { fontSize: 12, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },

  // Mini recipe card
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 3,
    maxWidth: 130,
  },
  miniCardTitle: { flex: 1, fontSize: 10, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },
  miniDiffDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  miniCardTime: { fontSize: 10, color: COLORS.text3, fontWeight: '600', flexShrink: 0, fontFamily: FONTS.body },

  // Partial top (< 3 cooks)
  partialPodium: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },

  // List section
  listSection: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: FONTS.bodyBold,
  },

  listCard: {
    backgroundColor: COLORS.surface1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listRank: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text3,
    width: 28,
    textAlign: 'center',
    flexShrink: 0,
    fontFamily: FONTS.bodyBold,
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listAvatarLetter: { fontSize: 18, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.titleBold },
  listInfo: { flex: 1, gap: 2 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listName: { fontSize: 14, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  listFlag: { width: 20, height: 14, borderRadius: 3 },
  listSpecialty: { fontSize: 12, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },

  listRatingWrap: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  listRatingCount: { fontSize: 10, color: COLORS.text3, fontWeight: '600', fontFamily: FONTS.body },

  // Skeleton
  skeletonWrap: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.body },
});
