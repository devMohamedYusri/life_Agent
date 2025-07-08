export const UserStorage = {
  getItem: <T>(key: string): T | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error(`Error parsing stored ${key}:`, e);
      return null;
    }
  },

  setItem: <T>(key: string, data: T): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error storing ${key}:`, e);
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing ${key}:`, e);
    }
  },
}; 