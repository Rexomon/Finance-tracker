// Utility functions for authentication

let authCheckPromise: Promise<boolean> | null = null;

export const checkAuthStatus = (): Promise<boolean> => {
  if (authCheckPromise) {
    return authCheckPromise;
  }

  authCheckPromise = (async () => {
    try {
      const response = await fetchWithAuth(
        `${import.meta.env.VITE_BACKEND_URL}/v1/users/profile`,
        {
          method: "GET",
        },
      );
      return response.ok;
    } catch (error) {
      console.error("Error checking auth status:", error);
      return false;
    }
  })();

  return authCheckPromise;
};

export const resetAuthStatus = (): void => {
  authCheckPromise = null;
};

export const logout = async (): Promise<void> => {
  try {
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/v1/users/logout`, {
      method: "POST",
      credentials: "include", // Include cookies
    });
    // Reset the auth check promise on logout
    resetAuthStatus();
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const defaultOptions: RequestInit = {
    credentials: "include", // Include cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    try {
      const refreshResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/v1/users/refresh`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (refreshResponse.ok) {
        // Retry the original request
        return await fetch(url, defaultOptions);
      }
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError);
    }
  }

  return response;
};
