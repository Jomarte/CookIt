import { useRouter, Redirect } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
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

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth, token } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (token) return <Redirect href="/(tabs)" />;

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const { user, token } = await api.login({ email, password });
      setAuth(user, token);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        {/* Logo */}
        <View style={styles.wordmarkWrap}>
          <Image source={require('../../assets/images/logo.jpeg')} style={styles.logoImage} />
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkCook}>Cook</Text>
            <Text style={styles.wordmarkIt}>It</Text>
          </View>
        </View>

        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.subtitle}>Entra na tua conta para continuar</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.accent} />
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.text3} style={styles.inputIcon} />
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
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.text3} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.text3}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.text3}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.bg} />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.registerBtnText}>
            Criar nova conta
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },

  wordmarkWrap: { alignItems: 'center', gap: 14, marginBottom: 10 },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: COLORS.borderActive,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  wordmarkCook: {
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.text1,
    letterSpacing: -0.8,
    fontFamily: FONTS.titleBlack,
  },
  wordmarkIt: {
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.primary,
    letterSpacing: -0.8,
    textShadowColor: COLORS.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    fontFamily: FONTS.titleBlack,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text1,
    letterSpacing: -0.4,
    marginTop: 6,
    fontFamily: FONTS.titleBold,
  },
  subtitle: { fontSize: 14, color: COLORS.text3, marginBottom: 4, fontFamily: FONTS.body },

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
  label: { fontSize: 11, fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FONTS.bodyBold },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    borderWidth: 1.5,
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
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '900', color: COLORS.bg, letterSpacing: 0.3, fontFamily: FONTS.bodyBold },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, color: COLORS.text3, fontFamily: FONTS.body },

  registerBtn: {
    alignSelf: 'stretch',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface1,
  },
  registerBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
});
