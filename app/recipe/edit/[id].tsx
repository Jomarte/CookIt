import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/Colors';
import { FONTS } from '../../../constants/Fonts';
import { api } from '../../../services/api';
import { useStore } from '../../../store/useStore';
import { getIngredientSuggestions, type IngredientEntry } from '../../../data/ingredients';

const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'];
const DIFF_COLORS: Record<string, string> = { 'Fácil': COLORS.green, 'Médio': COLORS.star, 'Difícil': COLORS.accent };
const CUISINES = ['Portuguesa', 'Italiana', 'Japonesa', 'Mexicana', 'Indiana', 'Francesa', 'Mediterrânica', 'Americana', 'Brasileira', 'Coreana', 'Chinesa', 'Tailandesa', 'Árabe', 'Africana', 'Fusão', 'Internacional'];
const DISH_TYPES = ['Entrada', 'Sopa', 'Prato Principal', 'Acompanhamento', 'Snack', 'Sobremesa', 'Pequeno-Almoço', 'Brunch', 'Lanche', 'Bebida', 'Molho', 'Pão / Pastelaria'];
const DIETS = ['Vegetariano', 'Vegan', 'Pescetariano', 'Sem Glúten', 'Sem Lactose', 'Low Carb', 'Keto', 'Alta Proteína', 'Saudável', 'Meal Prep', 'Comfort Food', 'Light'];
const COOKING_METHODS = ['Forno', 'Frigideira', 'Air Fryer', 'Grelhado', 'Micro-ondas', 'Panela', 'Panela de Pressão', 'Sem Cozinhar', 'Barbecue', 'Slow Cooker'];
const UNITS = ['g', 'kg', 'ml', 'L', 'c.s.', 'c.c.', 'un.', 'fatia', 'dente', 'ramo', 'q.b.', 'pitada'];
const NO_AMOUNT_UNITS = ['q.b.', 'pitada'];

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const MAX = 900;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = dataUrl;
  });
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useStore();
  const fileInputRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [photo, setPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [dishType, setDishType] = useState('');
  const [difficulty, setDifficulty] = useState('Fácil');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('2');
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<{ name: string; amount: string; unit: string; canonical: string; category: string }[]>([]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [focusedIngredient, setFocusedIngredient] = useState<number | null>(null);
  const [unitPickerIndex, setUnitPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    api.getRecipe(id).then((r) => {
      setPhoto(r.image || null);
      setTitle(r.title || '');
      setCuisine(r.cuisine || '');
      setDishType(r.dish_type || '');
      setDifficulty(r.difficulty || 'Fácil');
      setPrepTime(String(r.prep_time || ''));
      setCookTime(String(r.cook_time || ''));
      setServings(String(r.servings || 2));
      setSelectedDiets(r.diet || []);
      setSelectedMethods(r.cooking_method || []);
      setIngredients(
        (r.ingredients ?? []).length > 0
          ? r.ingredients.map((ing: any) => ({
              name: ing.name || '',
              amount: ing.amount || '',
              unit: ing.unit || 'g',
              canonical: ing.canonical_name || '',
              category: ing.category || 'Outros',
            }))
          : [{ name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' }]
      );
      setSteps((r.steps ?? []).length > 0 ? r.steps.map((s: any) => s.description || '') : ['']);
    }).catch(() => {
      if (Platform.OS === 'web') alert('Erro ao carregar receita.');
      else Alert.alert('Erro', 'Não foi possível carregar a receita.');
      router.back();
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleDiet = (d: string) => setSelectedDiets((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);
  const toggleMethod = (m: string) => setSelectedMethods((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]);

  const addIngredient = () => setIngredients((p) => [...p, { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' }]);
  const updateIngredientAmount = (i: number, val: string) => { const u = [...ingredients]; u[i] = { ...u[i], amount: val }; setIngredients(u); };
  const updateIngredientUnit = (i: number, unit: string) => { const u = [...ingredients]; u[i] = { ...u[i], unit }; setIngredients(u); };
  const updateIngredientName = (i: number, val: string) => { const u = [...ingredients]; u[i] = { ...u[i], name: val, canonical: '', category: 'Outros' }; setIngredients(u); setFocusedIngredient(i); };
  const selectSuggestion = (i: number, s: IngredientEntry) => { const u = [...ingredients]; u[i] = { ...u[i], name: s.name, canonical: s.name, category: s.category }; setIngredients(u); setFocusedIngredient(null); };
  const removeIngredient = (i: number) => setIngredients((p) => p.filter((_, idx) => idx !== i));

  const addStep = () => setSteps((p) => [...p, '']);
  const updateStep = (i: number, val: string) => { const u = [...steps]; u[i] = val; setSteps(u); };
  const removeStep = (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') alert('O título é obrigatório.');
      else Alert.alert('Erro', 'O título é obrigatório.');
      return;
    }
    const filledIngredients = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        amount: NO_AMOUNT_UNITS.includes(i.unit) ? '' : i.amount.trim(),
        unit: i.unit,
        category: i.category || 'Outros',
        canonical_name: i.canonical || null,
      }));
    const filledSteps = steps.filter((s) => s.trim()).map((s) => ({ description: s }));

    setSaving(true);
    try {
      await api.updateRecipe(token!, Number(id), {
        title: title.trim(),
        image: photo,
        cuisine: cuisine || 'Internacional',
        dish_type: dishType || 'Prato Principal',
        difficulty,
        prep_time: parseInt(prepTime) || 0,
        cook_time: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 2,
        cost: '€',
        diet: selectedDiets,
        cooking_method: selectedMethods,
        tags: [],
        ingredients: filledIngredients,
        steps: filledSteps,
      });
      router.back();
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e.message);
      else Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  const UnitPickerModal = () => (
    <Modal
      visible={unitPickerIndex !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setUnitPickerIndex(null)}
    >
      <TouchableOpacity style={styles.unitModalOverlay} activeOpacity={1} onPress={() => setUnitPickerIndex(null)}>
        <View style={styles.unitModalSheet}>
          <View style={styles.unitModalHeader}>
            <Text style={styles.unitModalTitle}>Unidade</Text>
            <TouchableOpacity onPress={() => setUnitPickerIndex(null)}>
              <Ionicons name="close" size={22} color={COLORS.text2} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={UNITS}
            keyExtractor={(u) => u}
            renderItem={({ item: u }) => {
              const selected = unitPickerIndex !== null && ingredients[unitPickerIndex]?.unit === u;
              return (
                <TouchableOpacity
                  style={[styles.unitOption, selected && styles.unitOptionSelected]}
                  onPress={() => {
                    if (unitPickerIndex !== null) updateIngredientUnit(unitPickerIndex, u);
                    setUnitPickerIndex(null);
                  }}
                >
                  <Text style={[styles.unitOptionText, selected && styles.unitOptionTextSelected]}>{u}</Text>
                  {selected && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <UnitPickerModal />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Receita</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={COLORS.bg} size="small" />
            : <Text style={styles.saveBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>

        {/* Foto */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async (e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string);
                setPhoto(compressed);
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }}
          />
        )}
        <TouchableOpacity
          style={[styles.photoArea, photo ? styles.photoAreaFilled : null]}
          onPress={() => Platform.OS === 'web' && fileInputRef.current?.click()}
          activeOpacity={0.85}
        >
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.photoOverlay}>
                <Ionicons name="camera-outline" size={22} color="#fff" />
                <Text style={styles.photoChangeText}>Alterar foto</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.photoIcon}>
                <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.photoText}>Adicionar foto</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Título */}
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput style={styles.input} placeholder="Ex: Bacalhau à Brás" placeholderTextColor={COLORS.text3} value={title} onChangeText={setTitle} />
        </View>

        {/* Culinária */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Culinária</Text>
            {cuisine ? <Text style={styles.labelSelected}>{cuisine}</Text> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {CUISINES.map((c) => (
              <TouchableOpacity key={c} style={[styles.pill, cuisine === c && styles.pillActive]} onPress={() => setCuisine(c)}>
                <Text style={[styles.pillText, cuisine === c && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tipo de Prato */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Tipo de Prato</Text>
            {dishType ? <Text style={styles.labelSelected}>{dishType}</Text> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {DISH_TYPES.map((dt) => (
              <TouchableOpacity key={dt} style={[styles.pill, dishType === dt && styles.pillActive]} onPress={() => setDishType(dt)}>
                <Text style={[styles.pillText, dishType === dt && styles.pillTextActive]}>{dt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dificuldade */}
        <View style={styles.section}>
          <Text style={styles.label}>Dificuldade</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d;
              const color = DIFF_COLORS[d];
              return (
                <TouchableOpacity key={d} style={[styles.diffBtn, active && { borderColor: color, backgroundColor: `${color}18` }]} onPress={() => setDifficulty(d)}>
                  <Text style={[styles.diffBtnText, active && { color }]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tempos */}
        <View style={styles.section}>
          <Text style={styles.label}>Tempos e Doses</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Prep (min)</Text>
              <TextInput style={styles.timeInput} placeholder="15" placeholderTextColor={COLORS.text3} keyboardType="numeric" value={prepTime} onChangeText={setPrepTime} />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Cozedura (min)</Text>
              <TextInput style={styles.timeInput} placeholder="30" placeholderTextColor={COLORS.text3} keyboardType="numeric" value={cookTime} onChangeText={setCookTime} />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Doses</Text>
              <TextInput style={styles.timeInput} placeholder="2" placeholderTextColor={COLORS.text3} keyboardType="numeric" value={servings} onChangeText={setServings} />
            </View>
          </View>
        </View>

        {/* Dieta */}
        <View style={styles.section}>
          <Text style={styles.label}>Dieta (opcional)</Text>
          <View style={styles.tagsWrap}>
            {DIETS.map((diet) => {
              const active = selectedDiets.includes(diet);
              return (
                <TouchableOpacity key={diet} style={[styles.tagPill, active && styles.tagPillGreen]} onPress={() => toggleDiet(diet)}>
                  {active && <Ionicons name="checkmark" size={12} color={COLORS.green} style={{ marginRight: 3 }} />}
                  <Text style={[styles.tagPillText, active && styles.tagPillTextGreen]}>{diet}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Método */}
        <View style={styles.section}>
          <Text style={styles.label}>Método de Confeção (opcional)</Text>
          <View style={styles.tagsWrap}>
            {COOKING_METHODS.map((method) => {
              const active = selectedMethods.includes(method);
              return (
                <TouchableOpacity key={method} style={[styles.tagPill, active && styles.tagPillBlue]} onPress={() => toggleMethod(method)}>
                  {active && <Ionicons name="checkmark" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />}
                  <Text style={[styles.tagPillText, active && styles.tagPillTextBlue]}>{method}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ingredientes */}
        <View style={styles.section}>
          <Text style={styles.label}>Ingredientes</Text>
          {ingredients.map((ing, i) => {
            const suggestions = focusedIngredient === i ? getIngredientSuggestions(ing.name) : [];
            const noAmount = NO_AMOUNT_UNITS.includes(ing.unit);
            return (
              <View key={i} style={styles.ingredientBlock}>
                <View style={styles.ingredientNameRow}>
                  <View style={styles.ingredientDot} />
                  <TextInput
                    style={[styles.ingredientInput, ing.canonical ? styles.ingredientInputMatched : null]}
                    placeholder={`Ingrediente ${i + 1}`}
                    placeholderTextColor={COLORS.text3}
                    value={ing.name}
                    onChangeText={(v) => updateIngredientName(i, v)}
                    onFocus={() => setFocusedIngredient(i)}
                    onBlur={() => setTimeout(() => setFocusedIngredient(null), 150)}
                  />
                  {!noAmount && (
                    <TextInput
                      style={styles.ingredientAmountInput}
                      placeholder="qtd"
                      placeholderTextColor={COLORS.text3}
                      keyboardType="decimal-pad"
                      value={ing.amount}
                      onChangeText={(v) => updateIngredientAmount(i, v)}
                    />
                  )}
                  {Platform.OS === 'web' ? (
                    <select
                      value={ing.unit}
                      onChange={(e: any) => updateIngredientUnit(i, e.target.value)}
                      style={{
                        appearance: 'none' as any,
                        WebkitAppearance: 'none' as any,
                        backgroundColor: ing.unit !== 'g' ? (COLORS.primaryDim as any) : (COLORS.surface2 as any),
                        border: `1px solid ${ing.unit !== 'g' ? COLORS.borderActive : COLORS.border}`,
                        borderRadius: 10,
                        padding: '0 20px 0 8px',
                        height: 42,
                        fontSize: 12,
                        fontWeight: '700',
                        color: ing.unit !== 'g' ? (COLORS.primary as any) : (COLORS.text2 as any),
                        cursor: 'pointer',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 6px center',
                        outline: 'none',
                        flexShrink: 0,
                      } as any}
                    >
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  ) : (
                    <TouchableOpacity
                      style={[styles.unitBtn, ing.unit !== 'g' && styles.unitBtnActive]}
                      onPress={() => setUnitPickerIndex(i)}
                    >
                      <Text style={[styles.unitBtnText, ing.unit !== 'g' && styles.unitBtnTextActive]}>{ing.unit}</Text>
                      <Ionicons name="chevron-down" size={10} color={ing.unit !== 'g' ? COLORS.primary : COLORS.text3} />
                    </TouchableOpacity>
                  )}
                  {ingredients.length > 1 && (
                    <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.removeBtn}>
                      <Ionicons name="remove-circle-outline" size={20} color={COLORS.accent} />
                    </TouchableOpacity>
                  )}
                </View>
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {suggestions.map((s) => (
                      <TouchableOpacity key={s.name} style={styles.suggestionItem} onPress={() => selectSuggestion(i, s)}>
                        <Text style={styles.suggestionName}>{s.name}</Text>
                        <Text style={styles.suggestionCategory}>{s.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity style={styles.addBtn} onPress={addIngredient}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Adicionar ingrediente</Text>
          </TouchableOpacity>
        </View>

        {/* Passos */}
        <View style={styles.section}>
          <Text style={styles.label}>Passos</Text>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <TextInput
                style={styles.stepInput}
                placeholder={`Passo ${i + 1}...`}
                placeholderTextColor={COLORS.text3}
                multiline
                value={step}
                onChangeText={(v) => updateStep(i, v)}
              />
              {steps.length > 1 && (
                <TouchableOpacity onPress={() => removeStep(i)} style={[styles.removeBtn, { marginTop: 12 }]}>
                  <Ionicons name="remove-circle-outline" size={20} color={COLORS.accent} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={addStep}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Adicionar passo</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.bg, fontFamily: FONTS.bodyBold },

  content: { padding: 16, gap: 12 },

  photoArea: {
    height: 200, backgroundColor: COLORS.surface1, borderRadius: 18,
    borderWidth: 1.5, borderColor: COLORS.borderActive, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden',
  },
  photoAreaFilled: { borderStyle: 'solid', borderColor: COLORS.border },
  photoPreview: { width: '100%', height: '100%', position: 'absolute' },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoChangeText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },
  photoIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primaryDim, alignItems: 'center', justifyContent: 'center' },
  photoText: { fontSize: 15, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },

  section: {
    backgroundColor: COLORS.surface1, borderRadius: 16,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text1, marginBottom: 12, fontFamily: FONTS.bodyBold },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  labelSelected: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    backgroundColor: COLORS.primaryDim, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderActive, overflow: 'hidden',
    fontFamily: FONTS.bodyBold,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: COLORS.text1, backgroundColor: COLORS.surface2,
    fontFamily: FONTS.body,
  },
  pillsRow: { gap: 8, flexDirection: 'row', paddingVertical: 2 },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2 },
  pillActive: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  pillText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  pillTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
  diffRow: { flexDirection: 'row', gap: 10 },
  diffBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface2 },
  diffBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  timeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 11, color: COLORS.text3, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, minHeight: 28, textAlignVertical: 'bottom', fontFamily: FONTS.bodyBold },
  timeInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, fontSize: 16, color: COLORS.text1, textAlign: 'center', backgroundColor: COLORS.surface2, fontFamily: FONTS.body },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2 },
  tagPillGreen: { backgroundColor: COLORS.greenDim, borderColor: COLORS.green },
  tagPillBlue: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  tagPillText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  tagPillTextGreen: { color: COLORS.green, fontWeight: '700', fontFamily: FONTS.bodyBold },
  tagPillTextBlue: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  ingredientBlock: { marginBottom: 14 },
  ingredientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, flexShrink: 0 },
  removeBtn: { padding: 2, flexShrink: 0 },
  ingredientAmountInput: {
    width: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 11, fontSize: 13, color: COLORS.text1,
    backgroundColor: COLORS.surface2, textAlign: 'center', flexShrink: 0,
    fontFamily: FONTS.body,
  },
  ingredientInput: {
    flex: 1, minWidth: 0, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 11, fontSize: 14, color: COLORS.text1, backgroundColor: COLORS.surface2,
    fontFamily: FONTS.body,
  },
  ingredientInputMatched: { borderColor: COLORS.borderActive, backgroundColor: COLORS.primaryDim },
  suggestionsBox: { marginLeft: 18, marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionName: { fontSize: 14, fontWeight: '600', color: COLORS.text1, fontFamily: FONTS.body },
  suggestionCategory: { fontSize: 11, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },

  unitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    height: 42, paddingHorizontal: 8, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2, flexShrink: 0,
  },
  unitBtnActive: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  unitBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text2, fontFamily: FONTS.bodyBold },
  unitBtnTextActive: { color: COLORS.primary },

  unitModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  unitModalSheet: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 30, maxHeight: '60%',
  },
  unitModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  unitModalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  unitOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  unitOptionSelected: { backgroundColor: COLORS.primaryDim },
  unitOptionText: { fontSize: 15, color: COLORS.text1, fontFamily: FONTS.body },
  unitOptionTextSelected: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: FONTS.body },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryDim, borderWidth: 1.5, borderColor: COLORS.borderActive, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexShrink: 0 },
  stepNumberText: { fontSize: 13, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  stepInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: COLORS.text1, minHeight: 70, textAlignVertical: 'top', backgroundColor: COLORS.surface2, fontFamily: FONTS.body },
});
