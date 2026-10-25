/** Bottom-tab route names — keep in sync with RootNavigator TabNavigator Tab.Screen names. */
export type TabParamList = {
  /** customWorkoutId — запуск кастомной тренировки (сегмент «Мои» в каталоге). */
  Тренировки: { customWorkoutId?: string } | undefined;
  Каталог: undefined;
  Питание: undefined;
  Прогресс: undefined;
  Профиль: undefined;
};
