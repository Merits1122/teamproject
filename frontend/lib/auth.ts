// 토큰 관리 유틸리티 함수들

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null

  // localStorage에서 토큰 확인
  const localToken = localStorage.getItem("token")
  if (localToken) return localToken

  // sessionStorage에서 토큰 확인
  const sessionToken = sessionStorage.getItem("token")
  if (sessionToken) return sessionToken

  // 쿠키에서 토큰 확인
  const cookieToken = getCookieValue("token")
  if (cookieToken) return cookieToken

  return null
}

export const setToken = (token: string, remember = false): void => {
  if (typeof window === "undefined") return

  if (remember) {
    localStorage.setItem("token", token)
  } else {
    sessionStorage.setItem("token", token)
  }
}

export const removeToken = (): void => {
  if (typeof window === "undefined") return

  // localStorage에서 제거
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")

  // sessionStorage에서 제거
  sessionStorage.removeItem("token")
  sessionStorage.removeItem("refreshToken")
  sessionStorage.removeItem("user")

  // 쿠키에서 제거
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
}

export const isTokenValid = (token: string): boolean => {
  if (!token) return false

  try {
    // JWT 토큰 디코딩 (실제 앱에서는 jwt-decode 라이브러리 사용)
    const payload = JSON.parse(atob(token.split(".")[1]))
    const currentTime = Date.now() / 1000

    return payload.exp > currentTime
  } catch (error) {
    return false
  }
}

export const getCookieValue = (name: string): string | null => {
  if (typeof window === "undefined") return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

// 토큰 상태 확인 함수 (디버깅용)
export const checkTokenStatus = (): void => {
  console.log("=== 토큰 상태 확인 ===")
  console.log("localStorage token:", localStorage.getItem("token"))
  console.log("sessionStorage token:", sessionStorage.getItem("token"))
  console.log("cookie token:", getCookieValue("token"))
  console.log("현재 토큰:", getToken())
  console.log("토큰 유효성:", getToken() ? isTokenValid(getToken()!) : false)
}
