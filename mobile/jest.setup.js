if (!globalThis.__asyncStorageMemory) {
  globalThis.__asyncStorageMemory = new Map();
}

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key) => {
    const value = globalThis.__asyncStorageMemory.get(key);
    return value === undefined ? null : value;
  }),
  setItem: jest.fn(async (key, value) => {
    globalThis.__asyncStorageMemory.set(key, String(value));
  }),
  removeItem: jest.fn(async (key) => {
    globalThis.__asyncStorageMemory.delete(key);
  }),
  clear: jest.fn(async () => {
    globalThis.__asyncStorageMemory.clear();
  }),
}));
