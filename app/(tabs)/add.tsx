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
import { useT, PT_CUISINES, PT_DISH_TYPES, PT_DIFFICULTIES, PT_DIETS, PT_COOKING_METHODS, UNITS, NO_AMOUNT_UNITS, translateUnit } from '../../i18n';

const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.red,
};

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
  const t = useT();
  const a = t.add;
  const { token, addNotification, language } = useStore();
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
    Alert.alert(a.photoTitle, a.photoQuestion, [
      {
        text: a.camera,
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(a.permissionTitle, a.permissionCamera);
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.75, base64: true });
          if (!result.canceled && result.assets[0].base64) {
            setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
          }
        },
      },
      {
        text: a.gallery,
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(a.permissionTitle, a.permissionGallery);
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.75, base64: true });
          if (!result.canceled && result.assets[0].base64) {
            setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
          }
        },
      },
      { text: t.common.cancel, style: 'cancel' },
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
      if (Platform.OS === 'web') { alert(a.errorTitle); }
      else { Alert.alert(t.common.error, a.errorTitle); }
      return;
    }
    if (!photo) {
      setShowErrors(true);
      if (Platform.OS === 'web') { alert(a.errorPhoto); }
      else { Alert.alert(a.photoTitle, a.errorPhoto); }
      return;
    }
    const missingAmount = ingredients.some(
      (i) => i.name.trim() && !NO_AMOUNT_UNITS.includes(i.unit) && !i.amount.trim()
    );
    if (missingAmount) {
      setShowErrors(true);
      if (Platform.OS === 'web') { alert(a.errorAmount); }
      else { Alert.alert(t.common.error, a.errorAmount); }
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
      addNotification({ type: 'recipe', title: a.successTitle, message: a.publishedMsg(title.trim()), icon: 'checkmark-circle-outline', color: COLORS.green });
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
            : <Text style={styles.publishBtnText}>{a.publishShort}</Text>
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
                <Text style={styles.photoChangeText}>{a.changePhoto}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.photoIcon}>
                <Ionicons name="camera-outline" size={32} color={showErrors ? COLORS.red : COLORS.primary} />
              </View>
              <Text style={[styles.photoText, showErrors && styles.photoTextError]}>{a.addPhoto} *</Text>
              <Text style={styles.photoSubtext}>{a.tapToSelect}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.recipeName} *</Text>
          <TextInput
            style={styles.input}
            placeholder={a.recipeNamePlaceholder}
            placeholderTextColor={COLORS.text3}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Culinária */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.cuisine} *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {PT_CUISINES.filter(c => c !== 'Todas').map((ptVal, idx) => (
              <TouchableOpacity
                key={ptVal}
                style={[styles.pill, cuisine === ptVal && styles.pillActive]}
                onPress={() => setCuisine(ptVal)}
              >
                <Text style={[styles.pillText, cuisine === ptVal && styles.pillTextActive]}>{a.cuisines[idx]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tipo de Prato */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.dishType} *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {PT_DISH_TYPES.filter(d => d !== 'Todos').map((ptVal, idx) => (
              <TouchableOpacity
                key={ptVal}
                style={[styles.pill, dishType === ptVal && styles.pillActive]}
                onPress={() => setDishType(ptVal)}
              >
                <Text style={[styles.pillText, dishType === ptVal && styles.pillTextActive]}>{a.dishTypes[idx]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.difficulty}</Text>
          <View style={styles.diffRow}>
            {PT_DIFFICULTIES.map((ptVal, idx) => {
              const active = difficulty === ptVal;
              const color = DIFF_COLORS[ptVal];
              return (
                <TouchableOpacity
                  key={ptVal}
                  style={[styles.diffBtn, active && { backgroundColor: color }]}
                  onPress={() => setDifficulty(ptVal)}
                >
                  <Text style={[styles.diffBtnText, active && { color: '#fff' }]}>{a.difficulties[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time & Servings */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.timingsTitle}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>{a.prep}</Text>
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
              <Text style={styles.timeLabel}>{a.cook}</Text>
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
              <Text style={styles.timeLabel}>{a.servings}</Text>
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
          <Text style={styles.label}>{a.diet} {a.optional}</Text>
          <View style={styles.tagsWrap}>
            {PT_DIETS.map((ptVal, idx) => {
              const active = selectedDiets.includes(ptVal);
              return (
                <TouchableOpacity
                  key={ptVal}
                  style={[styles.tagPill, active && styles.tagPillGreen]}
                  onPress={() => toggleDiet(ptVal)}
                >
                  {active && <Ionicons name="checkmark" size={12} color={COLORS.green} style={{ marginRight: 3 }} />}
                  <Text style={[styles.tagPillText, active && styles.tagPillTextGreen]}>{a.diets[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cooking Method */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.method} {a.optional}</Text>
          <View style={styles.tagsWrap}>
            {PT_COOKING_METHODS.map((ptVal, idx) => {
              const active = selectedMethods.includes(ptVal);
              return (
                <TouchableOpacity
                  key={ptVal}
                  style={[styles.tagPill, active && styles.tagPillBlue]}
                  onPress={() => toggleMethod(ptVal)}
                >
                  {active && <Ionicons name="checkmark" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />}
                  <Text style={[styles.tagPillText, active && styles.tagPillTextBlue]}>{a.methods[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.ingredientsTitle}</Text>
          {ingredients.map((ing, i) => {
            const suggestions = focusedIngredient === i ? getIngredientSuggestions(ing.name, language) : [];
            const noAmount = NO_AMOUNT_UNITS.includes(ing.unit);
            return (
              <View key={i} style={styles.ingredientBlock}>
                {/* Nome + Quantidade + Unidade */}
                <View style={styles.ingredientNameRow}>
                  <View style={styles.ingredientDot} />
                  <TextInput
                    style={[styles.ingredientInput, ing.canonical ? styles.ingredientInputMatched : null]}
                    placeholder={a.ingredientN(i + 1)}
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
                        <option key={u} value={u}>{translateUnit(u, language)}</option>
                      ))}
                    </select>
                  ) : (
                    <TouchableOpacity
                      style={[styles.unitBtn, ing.unit !== 'g' && styles.unitBtnActive]}
                      onPress={() => setUnitPickerIndex(i)}
                    >
                      <Text style={[styles.unitBtnText, ing.unit !== 'g' && styles.unitBtnTextActive]}>{translateUnit(ing.unit, language)}</Text>
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
            <Text style={styles.addBtnText}>{a.addIngredient}</Text>
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <Text style={styles.label}>{a.stepsTitle}</Text>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <TextInput
                style={styles.stepInput}
                placeholder={a.stepPlaceholder(i + 1)}
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
            <Text style={styles.addBtnText}>{a.addStep}</Text>
          </TouchableOpacity>
        </View>

        {/* Big publish button */}
        <TouchableOpacity
          style={[styles.publishBtnLarge, publishing && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={publishing}
          activeOpacity={0.85}
        >
          {publishing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.publishBtnLargeText}>{a.publishShort}</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Native unit picker modal */}
      <Modal visible={unitPickerIndex !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.unitModalOverlay} activeOpacity={1} onPress={() => setUnitPickerIndex(null)}>
          <View style={styles.unitModalBox}>
            <Text style={styles.unitModalTitle}>{a.selectUnit}</Text>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitModalItem, ingredients[unitPickerIndex!]?.unit === u && styles.unitModalItemActive]}
                onPress={() => { updateIngredientUnit(unitPickerIndex!, u); setUnitPickerIndex(null); }}
              >
                <Text style={[styles.unitModalItemText, ingredients[unitPickerIndex!]?.unit === u && styles.unitModalItemTextActive]}>{translateUnit(u, language)}</Text>
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

  content: { padding: 16, gap: 16 },

  photoArea: {
    height: 260,
    backgroundColor: COLORS.surface2,
    borderRadius: 20,
    borderWidth: 2,
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
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.text1, marginBottom: 12, fontFamily: FONTS.bodyBold },
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
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text1,
    backgroundColor: COLORS.surface1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
  },
  diffBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text3, fontFamily: FONTS.bodyBold },

  timeRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  timeField: {
    flex: 1,
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.text3,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.body,
    textAlign: 'center',
  },
  timeInput: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text1,
    textAlign: 'center',
    paddingVertical: 4,
    fontFamily: FONTS.bodyBold,
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
    marginBottom: 10,
  },
  ingredientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
    backgroundColor: COLORS.surface1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, flexShrink: 0 },
  removeBtn: { padding: 2, flexShrink: 0 },
  ingredientAmountInput: {
    width: 50,
    borderWidth: 0,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text1,
    backgroundColor: COLORS.surface2,
    textAlign: 'center',
    flexShrink: 0,
  },
  ingredientInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text1,
    backgroundColor: 'transparent',
  },
  ingredientInputMatched: {
    color: COLORS.primary,
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

  stepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  stepNumberText: { fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: FONTS.bodyBold },
  stepInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 14,
    color: COLORS.text1,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
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

  publishBtnLarge: {
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    backgroundImage: 'linear-gradient(135deg, #C2622D, #D4A853)' as any,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  publishBtnLargeText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    fontFamily: FONTS.bodyBold,
  },
});
