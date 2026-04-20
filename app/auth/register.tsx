import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useStore();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');
    setLoading(true);
    try {
      const { user, token } = await api.register({ name, username, email, password });
      setAuth(user, token);
      router.replace('/auth/setup-profile');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
          </TouchableOpacity>

          {/* Wordmark */}
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkCook}>Cook</Text>
            <Text style={styles.wordmarkIt}>It</Text>
          </View>

          <Text style={styles.title}>Cria a tua conta</Text>
          <Text style={styles.subtitle}>Começa a partilhar as tuas receitas</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.accent} />
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Nome</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="O teu nome"
                  placeholderTextColor={COLORS.text3}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputRow}>
                <Ionicons name="at-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="@username"
                  placeholderTextColor={COLORS.text3}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="o@teu.email"
                  placeholderTextColor={COLORS.text3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={COLORS.text3}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={COLORS.text3}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={styles.btnText}>Criar conta</Text>
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLinkText}>
              Já tens conta? <Text style={styles.loginLinkBold}>Entra aqui</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 10,
  },

  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  wordmark: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  wordmarkCook: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.white,
    letterSpacing: -0.5,
    fontFamily: FONTS.titleBlack,
  },
  wordmarkIt: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.primary,
    letterSpacing: -0.5,
    textShadowColor: COLORS.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: FONTS.titleBlack,
  },

  title: { fontSize: 22, fontWeight: '800', color: COLORS.text1, letterSpacing: -0.3, fontFamily: FONTS.titleBold },
  subtitle: { fontSize: 14, color: COLORS.text3, marginBottom: 8, fontFamily: FONTS.body },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  errorMsg: { color: COLORS.accent, fontSize: 13, fontWeight: '600', flex: 1, fontFamily: FONTS.body },

  form: { alignSelf: 'stretch', gap: 14 },
  inputWrap: { gap: 7 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: FONTS.bodyBold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text1,
    fontFamily: FONTS.body,
  },
  eyeBtn: { padding: 4 },

  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '800', color: COLORS.bg, fontFamily: FONTS.bodyBold },

  loginLink: { marginTop: 16 },
  loginLinkText: { fontSize: 14, color: COLORS.text3, fontFamily: FONTS.body },
  loginLinkBold: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
});
