import { useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
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
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { getIngredientSuggestions, type IngredientEntry } from '../../data/ingredients';

const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'];
const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.red,
};
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

export default function AddScreen() {
  const router = useRouter();
  const { token, addNotification } = useStore();
  const fileInputRef = useRef<any>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [dishType, setDishType] = useState('');
  const [difficulty, setDifficulty] = useState('Fácil');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState([
    { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' },
    { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' },
    { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' },
  ]);
  const [focusedIngredient, setFocusedIngredient] = useState<number | null>(null);
  const [steps, setSteps] = useState(['', '']);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [unitPickerIndex, setUnitPickerIndex] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const handlePickPhoto = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    Alert.alert('Foto', 'Como queres adicionar a foto?', [
      {
        text: 'Câmara',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmara.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.75, base64: true });
          if (!result.canceled && result.assets[0].base64) {
            setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
          }
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.75, base64: true });
          if (!result.canceled && result.assets[0].base64) {
            setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const toggleDiet = (diet: string) =>
    setSelectedDiets((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet]
    );

  const toggleMethod = (method: string) =>
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );

  const addIngredient = () => setIngredients([...ingredients, { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' }]);
  const updateIngredientAmount = (i: number, val: string) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], amount: val };
    setIngredients(updated);
  };
  const updateIngredientUnit = (i: number, unit: string) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], unit };
    setIngredients(updated);
  };
  const updateIngredientName = (i: number, val: string) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], name: val, canonical: '', category: 'Outros' };
    setIngredients(updated);
    setFocusedIngredient(i);
  };
  const selectSuggestion = (i: number, suggestion: IngredientEntry) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], name: suggestion.name, canonical: suggestion.name, category: suggestion.category };
    setIngredients(updated);
    setFocusedIngredient(null);
  };
  const removeIngredient = (i: number) =>
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));

  const addStep = () => setSteps([...steps, '']);
  const updateStep = (i: number, val: string) => {
    const updated = [...steps];
    updated[i] = val;
    setSteps(updated);
  };
  const removeStep = (i: number) =>
    setSteps((prev) => prev.filter((_, idx) => idx !== i));

  const handlePublish = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') { alert('O título é obrigatório.'); }
      else { Alert.alert('Erro', 'O título é obrigatório.'); }
      return;
    }
    if (!photo) {
      setShowErrors(true);
      if (Platform.OS === 'web') { alert('A foto é obrigatória.'); }
      else { Alert.alert('Foto em falta', 'Adiciona uma foto à receita antes de publicar.'); }
      return;
    }
    const missingAmount = ingredients.some(
      (i) => i.name.trim() && !NO_AMOUNT_UNITS.includes(i.unit) && !i.amount.trim()
    );
    if (missingAmount) {
      setShowErrors(true);
      if (Platform.OS === 'web') { alert('Indica a quantidade de todos os ingredientes.'); }
      else { Alert.alert('Quantidade em falta', 'Indica a quantidade de todos os ingredientes.'); }
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
    const filledSteps = steps
      .filter((s) => s.trim())
      .map((s) => ({ description: s }));

    setPublishing(true);
    try {
      await api.createRecipe(token!, {
        title: title.trim(),
        image: photo ?? undefined,
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
      addNotification({ type: 'recipe', title: 'Receita publicada!', message: `"${title.trim()}" já está visível no feed.`, icon: 'checkmark-circle-outline', color: COLORS.green });
      setTitle(''); setCuisine(''); setDishType(''); setDifficulty('Fácil');
      setPrepTime(''); setCookTime(''); setServings('1');
      setIngredients([
        { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' },
        { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' },
        { name: '', amount: '', unit: 'g', canonical: '', category: 'Outros' },
      ]);
      setSteps(['', '']); setSelectedDiets([]); setSelectedMethods([]);
      setPhoto(null);
      router.push('/(tabs)');
    } catch (e: any) {
      if (Platform.OS === 'web') { alert(e.message); }
      else { Alert.alert('Erro', e.message); }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkC}>C</Text>
          <Text style={styles.wordmarkK}>K</Text>
        </View>
        <TouchableOpacity
          style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={publishing}
        >
          {publishing
            ? <ActivityIndicator color={COLORS.bg} size="small" />
            : <Text style={styles.publishBtnText}>Publicar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {/* Photo */}
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
          style={[styles.photoArea, photo ? styles.photoAreaFilled : null, showErrors && !photo && styles.photoAreaError]}
          onPress={handlePickPhoto}
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
                <Ionicons name="camera-outline" size={32} color={showErrors ? COLORS.red : COLORS.primary} />
              </View>
              <Text style={[styles.photoText, showErrors && styles.photoTextError]}>Adicionar foto *</Text>
              <Text style={styles.photoSubtext}>Clica para selecionar uma imagem</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Bacalhau à Brás"
            placeholderTextColor={COLORS.text3}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Culinária */}
        <View style={styles.section}>
          <Text style={styles.label}>Culinária *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {CUISINES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.pill, cuisine === c && styles.pillActive]}
                onPress={() => setCuisine(c)}
              >
                <Text style={[styles.pillText, cuisine === c && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tipo de Prato */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de Prato *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {DISH_TYPES.map((dt) => (
              <TouchableOpacity
                key={dt}
                style={[styles.pill, dishType === dt && styles.pillActive]}
                onPress={() => setDishType(dt)}
              >
                <Text style={[styles.pillText, dishType === dt && styles.pillTextActive]}>{dt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={styles.label}>Dificuldade</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d;
              const color = DIFF_COLORS[d];
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.diffBtn, active && { borderColor: color, backgroundColor: `${color}18` }]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.diffBtnText, active && { color }]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time & Servings */}
        <View style={styles.section}>
          <Text style={styles.label}>Tempos e Doses</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Prep (min)</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="15"
                placeholderTextColor={COLORS.text3}
                keyboardType="numeric"
                value={prepTime}
                onChangeText={setPrepTime}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Cozedura (min)</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="30"
                placeholderTextColor={COLORS.text3}
                keyboardType="numeric"
                value={cookTime}
                onChangeText={setCookTime}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Doses</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="1"
                placeholderTextColor={COLORS.text3}
                keyboardType="numeric"
                value={servings}
                onChangeText={setServings}
              />
            </View>
          </View>
        </View>

        {/* Diets */}
        <View style={styles.section}>
          <Text style={styles.label}>Dieta (opcional)</Text>
          <View style={styles.tagsWrap}>
            {DIETS.map((diet) => {
              const active = selectedDiets.includes(diet);
              return (
                <TouchableOpacity
                  key={diet}
                  style={[styles.tagPill, active && styles.tagPillGreen]}
                  onPress={() => toggleDiet(diet)}
                >
                  {active && <Ionicons name="checkmark" size={12} color={COLORS.green} style={{ marginRight: 3 }} />}
                  <Text style={[styles.tagPillText, active && styles.tagPillTextGreen]}>{diet}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cooking Method */}
        <View style={styles.section}>
          <Text style={styles.label}>Método de Confeção (opcional)</Text>
          <View style={styles.tagsWrap}>
            {COOKING_METHODS.map((method) => {
              const active = selectedMethods.includes(method);
              return (
                <TouchableOpacity
                  key={method}
                  style={[styles.tagPill, active && styles.tagPillBlue]}
                  onPress={() => toggleMethod(method)}
                >
                  {active && <Ionicons name="checkmark" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />}
                  <Text style={[styles.tagPillText, active && styles.tagPillTextBlue]}>{method}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.label}>Ingredientes</Text>
          {ingredients.map((ing, i) => {
            const suggestions = focusedIngredient === i ? getIngredientSuggestions(ing.name) : [];
            const noAmount = NO_AMOUNT_UNITS.includes(ing.unit);
            return (
              <View key={i} style={styles.ingredientBlock}>
                {/* Nome + Quantidade + Unidade */}
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
                      style={[
                        styles.ingredientAmountInput,
                        showErrors && ing.name.trim() && !ing.amount.trim() && styles.ingredientAmountError,
                      ]}
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
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  ) : (
                    <TouchableOpacity
                      style={[styles.unitBtn, ing.unit !== 'g' && styles.unitBtnActive]}
                      onPress={() => setUnitPickerIndex(i)}
                    >
                      <Text style={[styles.unitBtnText, ing.unit !== 'g' && styles.unitBtnTextActive]}>{ing.unit}</Text>
                    </TouchableOpacity>
                  )}
                  {ingredients.length > 1 && (
                    <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.removeBtn}>
                      <Ionicons name="remove-circle-outline" size={20} color={COLORS.accent} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Autocomplete */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {suggestions.map((s) => (
                      <TouchableOpacity
                        key={s.name}
                        style={styles.suggestionItem}
                        onPress={() => selectSuggestion(i, s)}
                      >
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

        {/* Steps */}
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

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Native unit picker modal */}
      <Modal visible={unitPickerIndex !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.unitModalOverlay} activeOpacity={1} onPress={() => setUnitPickerIndex(null)}>
          <View style={styles.unitModalBox}>
            <Text style={styles.unitModalTitle}>Selecionar unidade</Text>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitModalItem, ingredients[unitPickerIndex!]?.unit === u && styles.unitModalItemActive]}
                onPress={() => { updateIngredientUnit(unitPickerIndex!, u); setUnitPickerIndex(null); }}
              >
                <Text style={[styles.unitModalItemText, ingredients[unitPickerIndex!]?.unit === u && styles.unitModalItemTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text1, letterSpacing: -0.3, fontFamily: FONTS.titleBold },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  wordmarkC: { fontSize: 28, fontWeight: '900', color: COLORS.text1, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  wordmarkK: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  publishBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.bg, fontFamily: FONTS.bodyBold },

  content: { padding: 16, gap: 12 },

  photoArea: {
    height: 200,
    backgroundColor: COLORS.surface1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  photoAreaFilled: {
    borderStyle: 'solid',
    borderColor: COLORS.border,
    padding: 0,
  },
  photoAreaError: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.redDim,
  },
  photoTextError: { color: COLORS.red },
  photoPreview: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoChangeText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },
  photoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: { fontSize: 15, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  photoSubtext: { fontSize: 12, color: COLORS.text3, fontFamily: FONTS.body },

  section: {
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text1, marginBottom: 12, fontFamily: FONTS.bodyBold },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  labelHint: { fontSize: 12, color: COLORS.text3, fontStyle: 'italic', fontFamily: FONTS.body },
  labelSelected: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    overflow: 'hidden',
    fontFamily: FONTS.bodyBold,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text1,
    backgroundColor: COLORS.surface2,
  },

  pillsRow: { gap: 8, flexDirection: 'row', paddingVertical: 2 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  pillActive: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  pillText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  pillTextActive: { color: COLORS.primary, fontWeight: '700' },

  diffRow: { flexDirection: 'row', gap: 10 },
  diffBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
  },
  diffBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.bodyBold },

  timeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  timeField: { flex: 1 },
  timeLabel: {
    fontSize: 11,
    color: COLORS.text3,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minHeight: 28,
    textAlignVertical: 'bottom',
    fontFamily: FONTS.body,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 16,
    color: COLORS.text1,
    textAlign: 'center',
    backgroundColor: COLORS.surface2,
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  tagPillGreen: { backgroundColor: COLORS.greenDim, borderColor: COLORS.green },
  tagPillBlue: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  tagPillText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  tagPillTextGreen: { color: COLORS.green, fontWeight: '700' },
  tagPillTextBlue: { color: COLORS.primary, fontWeight: '700' },

  ingredientBlock: {
    marginBottom: 14,
  },
  ingredientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 0 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, flexShrink: 0 },
  removeBtn: { padding: 2, flexShrink: 0 },
  ingredientAmountInput: {
    width: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 11,
    fontSize: 13,
    color: COLORS.text1,
    backgroundColor: COLORS.surface2,
    textAlign: 'center',
    flexShrink: 0,
  },
  ingredientInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text1,
    backgroundColor: COLORS.surface2,
  },
  ingredientInputMatched: {
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  ingredientAmountError: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.redDim,
  },
  suggestionsBox: {
    marginLeft: 18,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface1,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionName: { fontSize: 14, fontWeight: '600', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  suggestionCategory: { fontSize: 11, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, fontFamily: FONTS.bodyBold },

  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexShrink: 0,
  },
  stepNumberText: { fontSize: 13, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  stepInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.text1,
    minHeight: 70,
    textAlignVertical: 'top',
    backgroundColor: COLORS.surface2,
  },
  unitBtn: {
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  unitBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },
  unitBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text2, fontFamily: FONTS.bodyBold },
  unitBtnTextActive: { color: COLORS.primary },
  unitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  unitModalBox: {
    backgroundColor: COLORS.surface1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
  },
  unitModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text3,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: FONTS.bodyBold,
  },
  unitModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 4,
  },
  unitModalItemActive: { backgroundColor: COLORS.primaryDim },
  unitModalItemText: { fontSize: 15, color: COLORS.text1, fontFamily: FONTS.body },
  unitModalItemTextActive: { color: COLORS.primary, fontWeight: '700' },
});
