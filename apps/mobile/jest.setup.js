const storage = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key) => (storage.has(key) ? storage.get(key) : null)),
  setItem: jest.fn(async (key, value) => {
    storage.set(key, value);
  }),
  removeItem: jest.fn(async (key) => {
    storage.delete(key);
  }),
  clear: jest.fn(async () => {
    storage.clear();
  }),
  getAllKeys: jest.fn(async () => [...storage.keys()]),
  multiGet: jest.fn(async (keys) => keys.map((key) => [key, storage.get(key) ?? null])),
  multiRemove: jest.fn(async (keys) => {
    keys.forEach((key) => storage.delete(key));
  }),
}));

// Minimal RN surface for unit tests under testEnvironment: node
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  Platform: { OS: 'ios', select: (spec) => spec.ios ?? spec.default },
  View: 'View',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(async () => ({
        sound: { playAsync: jest.fn(), unloadAsync: jest.fn() },
      })),
    },
  },
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (component) => component,
  },
  Easing: {
    ease: jest.fn(),
    inOut: jest.fn((easing) => easing),
  },
  useAnimatedProps: jest.fn((callback) => callback()),
  useSharedValue: jest.fn((value) => ({ value })),
  withRepeat: jest.fn((animation) => animation),
  withTiming: jest.fn((value) => value),
}));
