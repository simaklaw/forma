import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { isProfileComplete } from '@forma/core';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { toDateKey } from '@/engines/WorkoutStats';
import { MUSCLE_LABELS } from '@/domain/muscleKeys';
import { allExerciseMuscles, allExerciseNames } from '@/features/workout/catalog';
import {
  chatCompletion,
  normalizeBaseUrl,
  testConnection,
  testVision,
  visionUserContent,
  MAX_VISION_IMAGES,
  type ApiMessage
} from './openAiClient';
import { AI_ROLES, roleById } from './roles';
import { buildNutritionDaySnapshot, renderNutritionContext } from './nutritionContext';
import {
  buildMuscleVolumeSnapshot,
  buildWorkoutDaySnapshot,
  renderMuscleVolumeContext,
  renderWorkoutContext
} from './workoutContext';
import { contextHash } from './contextHash';
import { useAiAssistantStore } from './useAiAssistantStore';
import type { AiChatMessage, AiImageAttachment, AiRoleId } from './types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface FormState {
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  supportsVision: boolean;
}

const EMPTY_FORM: FormState = {
  label: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  supportsVision: false
};

const DIARY_KEY = 'nutritionist:nutrition-day';
const CHAT_HASH = 'chat';
const WORKOUT_KEY = 'coach:workout-day';

/**
 * Модал BYOK-ассистента: форма подключения (base URL, ключ, модель, vision),
 * роли (ассистент/нутрициолог/тренер), анализ дневника питания с кэшем по
 * хешу контекста, свободный чат и фото блюд (до MAX_VISION_IMAGES).
 */
export default function AiAssistantModal({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const t = useT();

  const providers = useAiAssistantStore((s) => s.providers);
  const activeProviderId = useAiAssistantStore((s) => s.activeProviderId);
  const conversations = useAiAssistantStore((s) => s.conversations);
  const upsertProvider = useAiAssistantStore((s) => s.upsertProvider);
  const deleteProvider = useAiAssistantStore((s) => s.deleteProvider);
  const setActiveProvider = useAiAssistantStore((s) => s.setActiveProvider);
  const appendTurn = useAiAssistantStore((s) => s.appendTurn);
  const clearConversation = useAiAssistantStore((s) => s.clearConversation);

  const active = providers.find((p) => p.id === activeProviderId) ?? null;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [testing, setTesting] = useState(false);
  const [roleId, setRoleId] = useState<AiRoleId>('assistant');
  const [diaryMode, setDiaryMode] = useState(false);
  const [workoutMode, setWorkoutMode] = useState(false);
  const [input, setInput] = useState('');
  const [photos, setPhotos] = useState<AiImageAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const role = roleById(roleId);
  const showForm = !active || editing;
  const chatKey = roleId + ':chat';
  const currentKey =
    roleId === 'nutritionist' && diaryMode
      ? DIARY_KEY
      : roleId === 'coach' && workoutMode
        ? WORKOUT_KEY
        : chatKey;
  const conversation = conversations[currentKey] ?? null;
  const messages = conversation?.messages ?? [];

  function beginEdit() {
    setForm(
      active
        ? {
            label: active.label,
            baseUrl: active.baseUrl,
            apiKey: active.apiKey,
            model: active.model,
            supportsVision: active.supportsVision
          }
        : EMPTY_FORM
    );
    setEditing(true);
  }

  function saveProvider() {
    const next: FormState = {
      label: form.label.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
      model: form.model.trim(),
      supportsVision: form.supportsVision
    };
    if (!next.label || !next.baseUrl || !next.apiKey || !next.model) {
      Alert.alert(t('aiProviderTitle'), t('aiFormIncomplete'));
      return;
    }
    try {
      normalizeBaseUrl(next.baseUrl);
    } catch (e) {
      Alert.alert(
        t('aiProviderTitle'),
        t('aiTestFail', { message: e instanceof Error ? e.message : String(e) })
      );
      return;
    }
    const created = upsertProvider({ ...next, id: editing && active ? active.id : undefined });
    setActiveProvider(created.id);
    setEditing(false);
  }

  function removeProvider() {
    if (!active) return;
    Alert.alert(t('aiProviderTitle'), t('aiDeleteProvider'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        onPress: () => {
          deleteProvider(active.id);
          setEditing(false);
          setForm(EMPTY_FORM);
        }
      }
    ]);
  }

  async function runTest(vision: boolean) {
    if (!form.baseUrl.trim() || !form.apiKey.trim() || !form.model.trim()) {
      Alert.alert(t('aiTestConnection'), t('aiFormIncomplete'));
      return;
    }
    setTesting(true);
    try {
      const config = {
        id: 'test',
        label: form.label.trim() || 'test',
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim(),
        model: form.model.trim(),
        supportsVision: form.supportsVision
      };
      if (vision) {
        await testVision(config);
        Alert.alert(t('aiTestVision'), t('aiTestVisionOk'));
      } else {
        const ms = await testConnection(config);
        Alert.alert(t('aiTestConnection'), t('aiTestOk', { ms }));
      }
    } catch (e) {
      Alert.alert(
        t('aiTestConnection'),
        t('aiTestFail', { message: e instanceof Error ? e.message.slice(0, 200) : String(e) })
      );
    } finally {
      setTesting(false);
    }
  }

  async function attachPhotos() {
    if (!active?.supportsVision) {
      Alert.alert(t('aiModalTitle'), t('aiVisionUnsupported'));
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true });
      if (result.canceled) return;
      const next: AiImageAttachment[] = [];
      for (const asset of result.assets ?? []) {
        if (photos.length + next.length >= MAX_VISION_IMAGES) break;
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64
        });
        const rawMime =
          typeof asset.mimeType === 'string' && asset.mimeType.startsWith('image/')
            ? asset.mimeType
            : null;
        next.push({ base64, mimeType: rawMime ?? 'image/jpeg' });
      }
      setPhotos([...photos, ...next].slice(0, MAX_VISION_IMAGES));
    } catch (e) {
      Alert.alert(
        t('aiModalTitle'),
        t('aiTestFail', { message: e instanceof Error ? e.message : String(e) })
      );
    }
  }

  async function runCompletion(
    key: string,
    hash: string,
    userText: string,
    images: AiImageAttachment[]
  ) {
    if (!active) return;
    setBusy(true);
    setNotice(null);
    try {
      const history: ApiMessage[] = (conversations[key]?.messages ?? [])
        .filter((m): m is AiChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
      const userMessage: ApiMessage = {
        role: 'user',
        content: images.length > 0 ? visionUserContent(userText, images) : userText
      };
      const reply = await chatCompletion(active, [
        { role: 'system', content: role.systemPrompt },
        ...history,
        userMessage
      ]);
      const storedUser =
        images.length > 0
          ? userText + ' [' + t('aiAttachPhoto', { count: images.length }) + ']'
          : userText;
      appendTurn(
        key,
        hash,
        { role: 'user', content: storedUser },
        { role: 'assistant', content: reply.content },
        reply.usage.totalTokens
      );
    } catch (e) {
      Alert.alert(
        t('aiModalTitle'),
        t('aiTestFail', { message: e instanceof Error ? e.message.slice(0, 300) : String(e) })
      );
    } finally {
      setBusy(false);
    }
  }

  function sendChat() {
    const text = input.trim();
    if (busy || (!text && photos.length === 0)) return;
    const images = photos;
    setInput('');
    setPhotos([]);
    void runCompletion(chatKey, CHAT_HASH, text || t('aiDefaultPhotoPrompt'), images);
  }

  function analyzeDiary() {
    if (busy) return;
    const state = useFitPulseStore.getState();
    const complete = isProfileComplete({
      weightKg: state.profile.weight,
      heightCm: state.profile.height,
      age: state.profile.age,
      gender: state.profile.sex
    });
    const targets = complete ? state.calculateTargets() : null;
    const snapshot = buildNutritionDaySnapshot(
      state.todayMeals,
      targets
        ? {
            target: targets.target,
            proteinTarget: targets.proteinTarget,
            fatTarget: targets.fatTarget,
            carbTarget: targets.carbTarget
          }
        : null,
      state.waterGlasses
    );
    const hash = contextHash(snapshot);
    const existing = conversations[DIARY_KEY];
    if (existing && existing.contextHash === hash) {
      setNotice(t('aiCachedNotice'));
      return;
    }
    void runCompletion(DIARY_KEY, hash, renderNutritionContext(snapshot), []);
  }

  function analyzeWorkout() {
    if (busy) return;
    const state = useFitPulseStore.getState();
    const snapshot = buildWorkoutDaySnapshot(
      state.setLogs,
      state.personalRecords,
      allExerciseNames(),
      toDateKey(new Date())
    );
    if (snapshot.exercises.length === 0) {
      Alert.alert(t('aiRoleCoach'), t('aiCoachNoWorkout'));
      return;
    }
    const volumeSnapshot = buildMuscleVolumeSnapshot(
      state.setLogs,
      allExerciseMuscles(),
      MUSCLE_LABELS
    );
    const hash = contextHash({ day: snapshot, volume: volumeSnapshot });
    const existing = conversations[WORKOUT_KEY];
    if (existing && existing.contextHash === hash) {
      setNotice(t('aiWorkoutCachedNotice'));
      return;
    }
    void runCompletion(
      WORKOUT_KEY,
      hash,
      renderWorkoutContext(snapshot) + '\n\n' + renderMuscleVolumeContext(volumeSnapshot),
      []
    );
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.ink, borderColor: colors.lineStrong, color: colors.paper }
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: colors.ink }]}>
        <View style={[styles.header, { borderBottomWidth: 1, borderColor: colors.line }]}>
          <Text style={[styles.title, { color: colors.paper }]}>{t('aiModalTitle')}</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Text style={[styles.closeBtn, { color: colors.lime }]}>{t('close')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {showForm ? (
            <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
              <Text style={[styles.fieldTitle, { color: colors.paper }]}>{t('aiProviderTitle')}</Text>

              <View style={styles.fieldGap}>
                <Text style={[styles.label, { color: colors.paperFaint }]}>{t('aiProviderLabel')}</Text>
                <TextInput
                  style={inputStyle}
                  value={form.label}
                  onChangeText={(label) => setForm({ ...form, label })}
                  placeholder="OpenRouter / OpenAI / Mistral"
                  placeholderTextColor={colors.paperFaint}
                />
              </View>

              <View style={styles.fieldGap}>
                <Text style={[styles.label, { color: colors.paperFaint }]}>{t('aiBaseUrlLabel')}</Text>
                <TextInput
                  style={inputStyle}
                  value={form.baseUrl}
                  onChangeText={(baseUrl) => setForm({ ...form, baseUrl })}
                  placeholder="https://openrouter.ai/api/v1"
                  placeholderTextColor={colors.paperFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              <View style={styles.fieldGap}>
                <Text style={[styles.label, { color: colors.paperFaint }]}>{t('aiApiKeyLabel')}</Text>
                <TextInput
                  style={inputStyle}
                  value={form.apiKey}
                  onChangeText={(apiKey) => setForm({ ...form, apiKey })}
                  placeholder="sk-…"
                  placeholderTextColor={colors.paperFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldGap}>
                <Text style={[styles.label, { color: colors.paperFaint }]}>{t('aiModelLabel')}</Text>
                <TextInput
                  style={inputStyle}
                  value={form.model}
                  onChangeText={(model) => setForm({ ...form, model })}
                  placeholder="gpt-4o-mini / mistral-small / qwen-vl"
                  placeholderTextColor={colors.paperFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.fieldGap}>
                <Text style={[styles.label, { color: colors.paperFaint }]}>{t('aiVisionLabel')}</Text>
                <View style={styles.chipRow}>
                  {(
                    [
                      { id: false, label: t('off') },
                      { id: true, label: t('on') }
                    ] as const
                  ).map((opt) => {
                    const on = form.supportsVision === opt.id;
                    return (
                      <TouchableOpacity
                        key={String(opt.id)}
                        style={[
                          styles.chip,
                          { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                          on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                        ]}
                        onPress={() => setForm({ ...form, supportsVision: opt.id })}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={t('aiVisionLabel')}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors.paperDim },
                            on && { color: colors.lime }
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.lime }]}
                  onPress={saveProvider}
                  accessibilityRole="button"
                  accessibilityLabel={t('aiSaveProvider')}
                >
                  <Text style={[styles.primaryBtnText, { color: colors.ink }]}>{t('aiSaveProvider')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.lineStrong, backgroundColor: colors.ink }]}
                  onPress={() => void runTest(false)}
                  disabled={testing}
                  accessibilityRole="button"
                  accessibilityLabel={t('aiTestConnection')}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.paper }]}>
                    {testing ? '…' : t('aiTestConnection')}
                  </Text>
                </TouchableOpacity>
                {form.supportsVision ? (
                  <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor: colors.lineStrong, backgroundColor: colors.ink }]}
                    onPress={() => void runTest(true)}
                    disabled={testing}
                    accessibilityRole="button"
                    accessibilityLabel={t('aiTestVision')}
                  >
                    <Text style={[styles.outlineBtnText, { color: colors.paper }]}>{t('aiTestVision')}</Text>
                  </TouchableOpacity>
                ) : null}
                {editing && active ? (
                  <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor: colors.lineStrong, backgroundColor: colors.ink }]}
                    onPress={removeProvider}
                    accessibilityRole="button"
                    accessibilityLabel={t('aiDeleteProvider')}
                  >
                    <Text style={[styles.outlineBtnText, { color: colors.paper }]}>
                      {t('aiDeleteProvider')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <View>
              <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
                <View style={styles.chipRow}>
                  {AI_ROLES.map((r) => {
                    const on = r.id === roleId;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.chip,
                          { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                          on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                        ]}
                        onPress={() => {
                          setRoleId(r.id);
                          setDiaryMode(false);
                          setWorkoutMode(false);
                          setNotice(null);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={t(r.titleKey)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors.paperDim },
                            on && { color: colors.lime }
                          ]}
                        >
                          {t(r.titleKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {roleId === 'nutritionist' ? (
                  <View style={[styles.chipRow, styles.subTabRow]}>
                    {(
                      [
                        { id: false, label: t('aiChatTab') },
                        { id: true, label: t('aiDiaryTab') }
                      ] as const
                    ).map((opt) => {
                      const on = diaryMode === opt.id;
                      return (
                        <TouchableOpacity
                          key={String(opt.id)}
                          style={[
                            styles.chip,
                            { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                            on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                          ]}
                          onPress={() => {
                            setDiaryMode(opt.id);
                            setNotice(null);
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={opt.label}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: colors.paperDim },
                              on && { color: colors.lime }
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {roleId === 'coach' ? (
                  <View style={[styles.chipRow, styles.subTabRow]}>
                    {(
                      [
                        { id: false, label: t('aiChatTab') },
                        { id: true, label: t('aiWorkoutTab') }
                      ] as const
                    ).map((opt) => {
                      const on = workoutMode === opt.id;
                      return (
                        <TouchableOpacity
                          key={String(opt.id)}
                          style={[
                            styles.chip,
                            { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                            on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                          ]}
                          onPress={() => {
                            setWorkoutMode(opt.id);
                            setNotice(null);
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={opt.label}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: colors.paperDim },
                              on && { color: colors.lime }
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                <Text style={[styles.metaText, { color: colors.paperFaint, marginTop: 8 }]}>
                  {t('aiProviderActive', { name: active.label || active.model })}
                </Text>
                <TouchableOpacity
                  onPress={beginEdit}
                  accessibilityRole="button"
                  accessibilityLabel={t('aiSettings')}
                >
                  <Text style={[styles.settingsLink, { color: colors.lime }]}>{t('aiSettings')}</Text>
                </TouchableOpacity>
              </View>

              {roleId === 'nutritionist' && diaryMode ? (
                <View style={styles.fieldGap}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.lime, opacity: busy ? 0.5 : 1 }]}
                    onPress={analyzeDiary}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('aiAnalyzeNutrition')}
                  >
                    <Text style={[styles.primaryBtnText, { color: colors.ink }]}>
                      {t('aiAnalyzeNutrition')}
                    </Text>
                  </TouchableOpacity>
                  {notice ? (
                    <Text style={[styles.notice, { color: colors.lime }]}>{notice}</Text>
                  ) : null}
                </View>
              ) : null}

              {roleId === 'coach' && workoutMode ? (
                <View style={styles.fieldGap}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.lime, opacity: busy ? 0.5 : 1 }]}
                    onPress={analyzeWorkout}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('aiAnalyzeWorkout')}
                  >
                    <Text style={[styles.primaryBtnText, { color: colors.ink }]}>
                      {t('aiAnalyzeWorkout')}
                    </Text>
                  </TouchableOpacity>
                  {notice ? (
                    <Text style={[styles.notice, { color: colors.lime }]}>{notice}</Text>
                  ) : null}
                </View>
              ) : null}

              {messages.length > 0 ? (
                <View>
                  {messages.map((m, i) => (
                    <View
                      key={i}
                      style={[
                        styles.bubbleRow,
                        m.role === 'user' ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          m.role === 'user'
                            ? { backgroundColor: colors.limeDim, borderColor: colors.lime }
                            : { backgroundColor: colors.panel, borderColor: colors.line }
                        ]}
                      >
                        <Text style={[styles.bubbleText, { color: colors.paper }]}>{m.content}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.empty, { color: colors.paperFaint }]}>{t('aiNoHistory')}</Text>
              )}

              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={colors.lime} />
                  <Text style={[styles.metaText, { color: colors.paperFaint }]}>{t('aiBusy')}</Text>
                </View>
              ) : null}

              {conversation ? (
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.paperFaint }]}>
                    {conversation.totalTokens} {t('aiTokensLabel')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      clearConversation(currentKey);
                      setNotice(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('aiClearChat')}
                  >
                    <Text style={[styles.metaText, { color: colors.lime }]}>{t('aiClearChat')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        {!showForm && !(roleId === 'nutritionist' && diaryMode) && !(roleId === 'coach' && workoutMode) ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.footer, { borderTopWidth: 1, borderColor: colors.line }]}
          >
            <View style={styles.inputRow}>
              {active?.supportsVision ? (
                <TouchableOpacity
                  style={[styles.photoBtn, { borderColor: colors.lineStrong, backgroundColor: colors.ink }]}
                  onPress={() => void attachPhotos()}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('aiAttachPhoto', { count: photos.length })}
                >
                  <Text style={[styles.chipText, { color: photos.length > 0 ? colors.lime : colors.paperDim }]}>
                    {t('aiAttachPhoto', { count: photos.length })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TextInput
                style={[
                  styles.chatInput,
                  { backgroundColor: colors.panel, borderColor: colors.lineStrong, color: colors.paper }
                ]}
                value={input}
                onChangeText={setInput}
                placeholder={t('aiInputPlaceholder')}
                placeholderTextColor={colors.paperFaint}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.lime, opacity: busy ? 0.5 : 1 }]}
                onPress={sendChat}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('aiSend')}
              >
                <Text style={[styles.sendBtnText, { color: colors.ink }]}>{t('aiSend')}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg
  },
  title: { fontSize: 20, fontFamily: fonts.mono },
  closeBtn: { fontSize: 14, fontFamily: fonts.bodySemi },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  fieldTitle: { fontSize: 15, fontFamily: fonts.bodySemi, marginBottom: 12 },
  fieldGap: { marginBottom: 12 },
  label: { fontSize: 11, marginBottom: 6, fontFamily: fonts.bodySemi },
  input: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subTabRow: { marginTop: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1
  },
  chipText: { fontSize: 12, fontFamily: fonts.bodySemi },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    alignItems: 'center'
  },
  primaryBtnText: { fontSize: 13, fontFamily: fonts.bodySemi },
  outlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center'
  },
  outlineBtnText: { fontSize: 13, fontFamily: fonts.bodySemi },
  metaText: { fontSize: 11 },
  settingsLink: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 6 },
  notice: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  bubbleRow: { marginBottom: 10 },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: radius.card, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12
  },
  footer: { padding: spacing.lg },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  photoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body,
    maxHeight: 100
  },
  sendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.control
  },
  sendBtnText: { fontSize: 13, fontFamily: fonts.bodySemi }
});
