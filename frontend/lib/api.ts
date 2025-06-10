import { getToken, removeToken } from "./auth"

type ApiResponse<T = any> = {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export const apiCall = async <T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const token = getToken()

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    // 토큰이 만료된 경우
    if (response.status === 401) {
      removeToken()

      // 전역 toast 표시
      if (typeof window !== "undefined" && (window as any).showToast) {
        ;(window as any).showToast({
          title: "세션이 만료되었습니다",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        })
      }

      // 로그인 페이지로 리디렉션
      window.location.href = "/login"
      return { success: false, error: "Token expired" }
    }

    if (!response.ok) {
      // 에러 toast 표시
      if (typeof window !== "undefined" && (window as any).showToast) {
        ;(window as any).showToast({
          title: "오류가 발생했습니다",
          description: data.message || "요청을 처리할 수 없습니다.",
          variant: "destructive",
        })
      }

      return { success: false, error: data.message || "Request failed" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("API call failed:", error)

    // 네트워크 에러 toast 표시
    if (typeof window !== "undefined" && (window as any).showToast) {
      ;(window as any).showToast({
        title: "네트워크 오류",
        description: "인터넷 연결을 확인해주세요.",
        variant: "destructive",
      })
    }

    return { success: false, error: "Network error" }
  }
}
