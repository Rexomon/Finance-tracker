<script setup lang="ts">
import { ref } from "vue";
import router from "@/router";

// Form state
const email = ref("");
const password = ref("");
const isLoading = ref(false);
const showPassword = ref(false);
const rememberMe = ref(false);

// Form validation
const emailError = ref("");
const passwordError = ref("");

// Validation functions
const validateEmail = (email: string) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!email) {
		return "Email is required";
	}
	if (!emailRegex.test(email)) {
		return "Please enter a valid email address";
	}
	return "";
};

const validatePassword = (password: string) => {
	if (!password) {
		return "Password is required";
	}
	return "";
};

// Form submission
const handleSubmit = async () => {
	// Reset errors
	emailError.value = "";
	passwordError.value = "";

	// Validate form
	emailError.value = validateEmail(email.value);
	passwordError.value = validatePassword(password.value);

	// If there are errors, don't submit
	if (emailError.value || passwordError.value) {
		return;
	}

	// Start loading
	isLoading.value = true;

	try {
		// Make API call to backend
		const response = await fetch(
			`${import.meta.env.VITE_BACKEND_URL}/v1/users/login`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include", // Important: include cookies in request
				body: JSON.stringify({
					email: email.value,
					password: password.value,
					rememberMe: rememberMe.value,
				}),
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || "Login failed");
		}

		alert("Login successful! Welcome back!");

		// Redirect to dashboard
		router.replace("/dashboard");
	} catch (error) {
		console.error("Login failed:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "Login failed. Please check your credentials.";
		alert(`Login failed: ${errorMessage}`);
	} finally {
		isLoading.value = false;
	}
};

// Input handlers with real-time validation
const handleEmailInput = () => {
	if (emailError.value) {
		emailError.value = validateEmail(email.value);
	}
};

const handlePasswordInput = () => {
	if (passwordError.value) {
		passwordError.value = validatePassword(password.value);
	}
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-300">
          Welcome back! Please enter your credentials
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="relative block w-full px-3 py-3 border border-gray-600 rounded-lg placeholder-gray-400 text-white bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all"
              :class="{ 'border-red-500 focus:ring-red-500 focus:border-red-500': emailError }"
              placeholder="Enter your email"
              @input="handleEmailInput"
            />
            <p v-if="emailError" class="mt-1 text-sm text-red-500">
              {{ emailError }}
            </p>
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                class="relative block w-full px-3 py-3 pr-10 border border-gray-600 rounded-lg placeholder-gray-400 text-white bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all"
                :class="{ 'border-red-500 focus:ring-red-500 focus:border-red-500': passwordError }"
                placeholder="Enter your password"
                @input="handlePasswordInput"
              />
              <button
                type="button"
                tabindex="-1"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showPassword = !showPassword"
              >
                <svg
                  class="h-5 w-5 text-gray-400 hover:text-gray-300"
                  :class="{ 'text-gray-300': showPassword }"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    v-if="!showPassword"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    v-if="!showPassword"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                  <path
                    v-if="showPassword"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              </button>
            </div>
            <p v-if="passwordError" class="mt-1 text-sm text-red-500">
              {{ passwordError }}
            </p>
          </div>
        </div>

        <!-- Remember Me & Forgot Password -->
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              v-model="rememberMe"
              type="checkbox"
              class="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-300">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <a href="#" class="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Forgot your password?
            </a>
          </div>
        </div>

        <!-- Submit Button -->
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span v-if="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            {{ isLoading ? 'Signing In...' : 'Sign In' }}
          </button>
        </div>

        <!-- Sign Up Link -->
        <div class="text-center">
          <p class="text-sm text-gray-300">
            Don't have an account?
            <router-link
              to="/signup"
              class="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign up here
            </router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
