import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { styles } from '../theme/styles';
import type { Tab } from '../types/mobile';

export function DecorativeBackground() {
  return (
    <View pointerEvents="none" style={styles.backgroundCanvas}>
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <View style={styles.bgOrbThree} />
      <View style={styles.bgMesh} />
    </View>
  );
}

export function CenterLoading() {
  return (
    <View style={styles.center}>
      <DecorativeBackground />
      <ActivityIndicator size="large" color="#17324d" />
      <Text style={styles.muted}>Carregando...</Text>
    </View>
  );
}

export function Message({ type, text }: { type: 'erro' | 'ok' | 'aviso'; text: string }) {
  const style =
    type === 'erro'
      ? styles.messageErro
      : type === 'ok'
        ? styles.messageOk
        : styles.messageAviso;

  return <Text style={[styles.message, style]}>{text}</Text>;
}

export function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" style={styles.input} {...props} />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.primaryBtn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled = false,
  danger = false,
  inverted = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  inverted?: boolean;
}) {
  return (
    <Pressable
      style={[styles.ghostBtn, inverted && styles.ghostBtnInverted, danger && styles.dangerBtn, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[styles.ghostText, inverted && styles.ghostTextInverted, danger && styles.dangerText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive, danger && !active && styles.chipDanger, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive, danger && !active && styles.chipDangerText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function OptionList<T extends { id: number; nome: string }>({
  label,
  items,
  value,
  onChange,
  empty = 'Nenhuma opção',
  noneLabel = 'Nenhum',
}: {
  label: string;
  items: T[];
  value: string;
  onChange: (id: string) => void;
  empty?: string;
  noneLabel?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        <Chip label={noneLabel} active={!value} onPress={() => onChange('')} />
        {items.map((item) => (
          <Chip key={item.id} label={item.nome} active={value === String(item.id)} onPress={() => onChange(String(item.id))} />
        ))}
        {!items.length && <Text style={styles.emptyInline}>{empty}</Text>}
      </ScrollView>
    </View>
  );
}

export function ScreenIntro({
  eyebrow,
  title,
  text,
  metrics = [],
}: {
  eyebrow: string;
  title: string;
  text: string;
  metrics?: Array<{ label: string; value: string | number; tone?: 'accent' | 'warning' }>;
}) {
  return (
    <View style={styles.introCard}>
      <Text style={styles.introEyebrow}>{eyebrow}</Text>
      <Text style={styles.introTitle}>{title}</Text>
      <Text style={styles.introText}>{text}</Text>
      {!!metrics.length && (
        <View style={styles.introMetricsRow}>
          {metrics.map((metric) => (
            <View
              key={metric.label}
              style={[
                styles.introMetricCard,
                metric.tone === 'accent' && styles.introMetricAccent,
                metric.tone === 'warning' && styles.introMetricWarning,
              ]}
            >
              <Text style={styles.introMetricValue}>{metric.value}</Text>
              <Text style={styles.introMetricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function SectionCard({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {!!text && <Text style={styles.panelText}>{text}</Text>}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function BottomTabs({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.bottomTabs}>
      <Pressable style={[styles.bottomTab, tab === 'os' && styles.bottomTabOn]} onPress={() => setTab('os')}>
        <Text style={[styles.bottomText, tab === 'os' && styles.bottomTextOn]}>OS</Text>
      </Pressable>
      <Pressable style={[styles.bottomTab, tab === 'agenda' && styles.bottomTabOn]} onPress={() => setTab('agenda')}>
        <Text style={[styles.bottomText, tab === 'agenda' && styles.bottomTextOn]}>Agenda</Text>
      </Pressable>
      <Pressable style={[styles.bottomTab, tab === 'nova' && styles.bottomTabOn]} onPress={() => setTab('nova')}>
        <Text style={[styles.bottomText, tab === 'nova' && styles.bottomTextOn]}>Nova OS</Text>
      </Pressable>
    </View>
  );
}
