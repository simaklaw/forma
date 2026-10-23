import type { StringKey } from '@/i18n/strings';
import type { AiRoleId } from './types';

export interface AiRole {
  id: AiRoleId;
  /** Ключ заголовка в словарях i18n (ru/en). */
  titleKey: StringKey;
  systemPrompt: string;
}

const ANSWER_RULE =
  'Отвечай кратко и по делу, на языке пользователя. Ты не врач: при симптомах и медицинских вопросах советуйте обратиться к специалисту.';

/**
 * Готовые роли ассистента (по мотивам free-fitness): каждая — свой системный
 * промпт и рабочая область. Данные дневника подставляются отдельным сообщением.
 */
export const AI_ROLES: readonly AiRole[] = [
  {
    id: 'assistant',
    titleKey: 'aiRoleAssistant',
    systemPrompt:
      'Ты — встроенный ассистент фитнес-приложения FitPulse. Помогаешь с вопросами о тренировках, питании и восстановлении. ' +
      ANSWER_RULE
  },
  {
    id: 'nutritionist',
    titleKey: 'aiRoleNutritionist',
    systemPrompt:
      'Ты — нутрициолог фитнес-приложения FitPulse. Пользователь может прислать сводку дневника питания (калории, БЖУ, цели) и/или фото блюд. Оцени рацион, отметь сильные и слабые стороны, дай конкретные шаги. ' +
      ANSWER_RULE
  },
  {
    id: 'coach',
    titleKey: 'aiRoleCoach',
    systemPrompt:
      'Ты — тренер фитнес-приложения FitPulse. Помогаешь с планированием тренировок, техникой упражнений, прогрессией нагрузок и восстановлением. Пользователь может прислать сводку сегодняшней тренировки (упражнения, подходы, веса, RIR): оцени выполнение, прогрессию и восстановление, дай конкретные шаги. ' +
      ANSWER_RULE
  }
];

export function roleById(id: AiRoleId): AiRole {
  const role = AI_ROLES.find((r) => r.id === id);
  if (!role) throw new Error(`Unknown AI role: ${id}`);
  return role;
}
