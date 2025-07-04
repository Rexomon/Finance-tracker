// Utility functions for authentication
export const checkAuthStatus = async (): Promise<boolean> => {
	try {
		const response = await fetch(
			`${import.meta.env.VITE_BACKEND_URL}/v1/users/profile`,
			{
				method: "GET",
				credentials: "include", // Include cookies
			},
		);

		return response.ok;
	} catch (error) {
		console.error("Error checking auth status:", error);
		return false;
	}
};

export const logout = async (): Promise<void> => {
	try {
		await fetch(`${import.meta.env.VITE_BACKEND_URL}/v1/users/logout`, {
			method: "POST",
			credentials: "include", // Include cookies
		});
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
