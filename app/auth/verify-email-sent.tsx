import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

export default function VerifyEmailSentScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      await api.resendVerification(email);
      setResent(true);
    } catch (e: any) {
      setError(e.message || 'Erro ao reenviar email');
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={56} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Verifica o teu email</Text>
        <Text style={styles.subtitle}>
          Enviámos um link de confirmação para:
        </Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.instructions}>
          Abre o email e clica no botão de confirmação. Depois volta aqui e faz login.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={COLORS.accent} />
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        ) : null}

        {resent ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#4CAF50" />
            <Text style={styles.successMsg}>Email reenviado!</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.loginBtnText}>Já confirmei — fazer login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendBtn, resending && styles.btnDisabled]}
          onPress={handleResend}
          disabled={resending || resent}
        >
          {resending
            ? <ActivityIndicator color={COLORS.text2} size="small" />
            : <Text style={styles.resendBtnText}>Reenviar email de confirmação</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/auth/register')}>
          <Text style={styles.backText}>Voltar ao registo</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text1,
    fontFamily: FONTS.titleBold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text3,
    fontFamily: FONTS.body,
    textAlign: 'center',
  },
  email: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: COLORS.text2,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successMsg: { color: '#4CAF50', fontSize: 13, fontWeight: '600', flex: 1, fontFamily: FONTS.body },
  loginBtn: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.bg,
    fontFamily: FONTS.bodyBold,
  },
  resendBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface1,
  },
  btnDisabled: { opacity: 0.5 },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text2,
    fontFamily: FONTS.body,
  },
  backText: {
    fontSize: 13,
    color: COLORS.text3,
    fontFamily: FONTS.body,
    marginTop: 4,
  },
});
