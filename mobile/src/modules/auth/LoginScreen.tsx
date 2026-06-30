import React from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { APP_NAME } from '../../config/app';
import { styles } from '../../theme/styles';
import { DecorativeBackground, Field, Message, PrimaryButton } from '../../components/ui';

export function LoginScreen({
  email,
  senha,
  erro,
  carregando,
  setEmail,
  setSenha,
  onLogin,
}: {
  email: string;
  senha: string;
  erro: string;
  carregando: boolean;
  setEmail: (value: string) => void;
  setSenha: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <SafeAreaView style={styles.loginPage}>
      <StatusBar style="light" />
      <DecorativeBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginWrap}>
        <View style={styles.loginCard}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.loginTitle}>Operação em campo com mais controle</Text>
          <Text style={styles.loginText}>
            Gerencie ordens de serviço, agenda, evidências, checklist e assinaturas em uma experiência mais clara e profissional.
          </Text>
          <View style={styles.loginBadgeRow}>
            <View style={styles.loginBadge}>
              <Text style={styles.loginBadgeText}>Ordens de serviço</Text>
            </View>
            <View style={styles.loginBadge}>
              <Text style={styles.loginBadgeText}>Checklist técnico</Text>
            </View>
            <View style={styles.loginBadge}>
              <Text style={styles.loginBadgeText}>Assinatura no local</Text>
            </View>
          </View>
          {!!erro && <Message type="erro" text={erro} />}
          <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
          <PrimaryButton label={carregando ? 'Entrando...' : 'Entrar'} onPress={onLogin} disabled={carregando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
