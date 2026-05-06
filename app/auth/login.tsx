import { useRouter, Redirect } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
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

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
});

export default function LoginScreen() {
  const router = useRouter();
  const t = useT();
  const { setAuth, token, language, setLanguage } = useStore();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [langModal, setLangModal] = useState(false);

  if (token) return <Redirect href="/(tabs)" />;

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Não foi possível obter o token Google');
      const { user, token: jwt, is_new } = await api.googleLogin(idToken);
      setAuth(user, jwt);
      router.replace(is_new ? '/auth/setup-profile' : '/(tabs)');
    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === statusCodes.IN_PROGRESS) return;
      setError(e.message || 'Erro ao entrar com Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Language button */}
      <TouchableOpacity style={styles.langBtn} onPress={() => setLangModal(true)}>
        <Ionicons name="language-outline" size={18} color={COLORS.text2} />
        <Text style={styles.langBtnText}>{language === 'pt' ? '🇵🇹' : '🇬🇧'}</Text>
      </TouchableOpacity>

      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.wordmarkWrap}>
          <Image source={require('../../assets/images/logo-new.png')} style={styles.logoImage} />
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkCook}>Cook</Text>
            <Text style={styles.wordmarkIt}>It</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {language === 'pt' ? 'Bem-vindo ao CookIt' : 'Welcome to CookIt'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'pt' ? 'Entra com a tua conta Google para começar' : 'Sign in with your Google account to get started'}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.accent} />
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        ) : null}

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
              <Text style={styles.googleBtnText}>
                {language === 'pt' ? 'Continuar com Google' : 'Continue with Google'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Language modal */}
      <Modal visible={langModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLangModal(false)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t.settings.languageModalTitle}</Text>
            <TouchableOpacity
              style={[styles.langOption, language === 'pt' && styles.langOptionActive]}
              onPress={() => { setLanguage('pt'); setLangModal(false); }}
            >
              <Text style={[styles.langOptionText, language === 'pt' && styles.langOptionTextActive]}>{t.settings.langPT}</Text>
              {language === 'pt' && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              onPress={() => { setLanguage('en'); setLangModal(false); }}
            >
              <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>{t.settings.langEN}</Text>
              {language === 'en' && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    gap: 12,
  },

  wordmarkWrap: { alignItems: 'center', gap: 14, marginBottom: 16 },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: COLORS.borderActive,
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
    textAlign: 'center',
    fontFamily: FONTS.titleBold,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text3,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: FONTS.body,
  },

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

  btnDisabled: { opacity: 0.6 },

  googleBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface1,
  },
  googleIcon: { width: 20, height: 20, borderRadius: 4 },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },

  langBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langBtnText: { fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: COLORS.surface1,
    borderRadius: 20,
    padding: 20,
    width: 260,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text1,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: FONTS.bodyBold,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  langOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  langOptionText: { fontSize: 15, color: COLORS.text1, fontFamily: FONTS.body },
  langOptionTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
});
