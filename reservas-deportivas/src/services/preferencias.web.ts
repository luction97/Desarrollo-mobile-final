export default {
  async getItem(clave: string): Promise<string | null> {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(clave);
  },
  async setItem(clave: string, valor: string): Promise<void> {
    if (typeof window !== 'undefined') window.localStorage.setItem(clave, valor);
  },
  async removeItem(clave: string): Promise<void> {
    if (typeof window !== 'undefined') window.localStorage.removeItem(clave);
  },
};
