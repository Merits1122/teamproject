import { getToken, removeToken } from "./auth"

type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    message: string;
    status: number;
  };
};

export const apiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {

  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${endpoint}`; 
  const token = getToken();

  const defaultHeaders: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }
  if (options.body instanceof FormData) {
    delete defaultHeaders['Content-Type'];
  }


  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    cache: 'no-store',
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: { 
          message: errorText || `서버 오류가 발생했습니다. (상태: ${response.status})`, 
          status: response.status 
        } 
      };
    }
    
    const responseBody = await response.text();
    if (!responseBody) {
        return { success: true, data: null as T };
    }
    try {
      const data = JSON.parse(responseBody);
      return { success: true, data };
    } catch (e) {
        return { success: true, data: responseBody as T };
    }
  } catch (error: any) {
    console.error("네트워크 오류 발생:", error);
    return {
      success: false,
      error: {
        message: "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.",
        status: 0,
      },
    };
  }
};