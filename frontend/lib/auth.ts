import Cookies from 'js-cookie';

export const getToken = (): string | null => {
  return Cookies.get("token") || null;
}

export const setToken = (token: string, remember = false): void => {
  if (typeof window === "undefined") return;
  
  const options: Cookies.CookieAttributes = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  if (remember) {
    options.expires = 7;
  }
  Cookies.set("token", token, options);
}

export const removeToken = (): void => {
  if (typeof window === "undefined") return

  localStorage.removeItem("app_user_identifier");
  sessionStorage.removeItem("app_user_identifier");

  Cookies.remove("token", { path: '/' });
}
