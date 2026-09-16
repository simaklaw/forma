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
