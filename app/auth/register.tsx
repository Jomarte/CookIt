import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n';

const PRIVACY_POLICY_URL = 'https://cookit-qo0c.onrender.com/privacy';
const TERMS_URL = 'https://cookit-qo0c.onrender.com/terms';

export default function RegisterScreen() {
  const router = useRouter();
  const t = useT();
  const au = t.auth;
  const { setAuth, language } = useStore();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Não foi possível obter o token Google');
      const { user, token, is_new } = await api.googleLogin(idToken);
      setAuth(user, token);
      router.replace(is_new ? '/auth/setup-profile' : '/(tabs)');
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === statusCodes.IN_PROGRESS) return;
      setError(e.message || 'Erro ao entrar com Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  function validatePassword(pw: string): string | null {
    if (pw.length < 7) return au.passwordRuleLength;
    if (!/[A-Z]/.test(pw)) return au.passwordRuleUpper;
    if (!/[0-9]/.test(pw)) return au.passwordRuleNumber;
    if (!/[^A-Za-z0-9]/.test(pw)) return au.passwordRuleSymbol;
    return null;
  }

  async function handleRegister() {
    if (!termsAccepted) {
      setError(au.termsError);
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { user, token } = await api.register({ name, username, email, password, terms_accepted: true });
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

          <Text style={styles.title}>{au.registerTitle}</Text>
          <Text style={styles.subtitle}>{au.registerSubtitle}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.accent} />
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>{au.name}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={au.namePlaceholder}
                  placeholderTextColor={COLORS.text3}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>{au.username}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="at-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={au.usernamePlaceholder}
                  placeholderTextColor={COLORS.text3}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>{au.email}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={au.emailPlaceholder}
                  placeholderTextColor={COLORS.text3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>{au.password}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={17} color={COLORS.text3} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={au.passwordMinChars}
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
              {password.length > 0 && (
                <View style={styles.pwRules}>
                  {[
                    { ok: password.length >= 7, label: au.passwordRuleLength },
                    { ok: /[A-Z]/.test(password), label: au.passwordRuleUpper },
                    { ok: /[0-9]/.test(password), label: au.passwordRuleNumber },
                    { ok: /[^A-Za-z0-9]/.test(password), label: au.passwordRuleSymbol },
                  ].map(({ ok, label }) => (
                    <View key={label} style={styles.pwRule}>
                      <Ionicons
                        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                        size={13}
                        color={ok ? '#4CAF50' : COLORS.text3}
                      />
                      <Text style={[styles.pwRuleText, ok && styles.pwRuleOk]}>{label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Terms checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setTermsAccepted(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={13} color={COLORS.bg} />}
              </View>
              <Text style={styles.termsText}>
                {au.termsLabel}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
                  {au.termsLink}
                </Text>
                {au.termsAnd}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                  {au.termsPrivacyLink}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, (loading || !termsAccepted) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading || !termsAccepted}
            >
              {loading
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={styles.btnText}>{au.registerBtn}</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={COLORS.text1} size="small" />
            ) : (
              <>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleBtnText}>{language === 'pt' ? 'Continuar com Google' : 'Continue with Google'}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLinkText}>
              {au.hasAccount} <Text style={styles.loginLinkBold}>{au.signInHere}</Text>
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

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    fontSize: 13,
    color: COLORS.text2,
    fontFamily: FONTS.body,
    flex: 1,
    flexWrap: 'wrap',
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: FONTS.bodyBold,
    textDecorationLine: 'underline',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, color: COLORS.text3, fontFamily: FONTS.body },

  googleBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface1,
  },
  googleIcon: { width: 20, height: 20, borderRadius: 4 },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },

  loginLink: { marginTop: 8 },
  loginLinkText: { fontSize: 14, color: COLORS.text3, fontFamily: FONTS.body },
  loginLinkBold: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  pwRules: { gap: 4, marginTop: 8, paddingHorizontal: 2 },
  pwRule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwRuleText: { fontSize: 12, color: COLORS.text3, fontFamily: FONTS.body },
  pwRuleOk: { color: '#4CAF50' },
});
