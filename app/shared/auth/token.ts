/**
 * Centraliza o acesso ao token do client.
 * Mantém o resto do código desacoplado de "localStorage".
 */
export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", token);
  },
  remove() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
  },
};
