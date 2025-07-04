<script setup lang="ts">
import { ref } from "vue";
import router from "@/router";

// Form state
const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// Form validation
const nameError = ref("");
const emailError = ref("");
const passwordError = ref("");
const confirmPasswordError = ref("");

// Validation functions
const validateName = (name: string) => {
	if (!name) {
		return "Username is required";
	}
	if (name.length < 3) {
		return "Username must be at least 3 characters long";
	}
	if (name.length > 50) {
		return "Username must be less than 50 characters";
	}
	return "";
};

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
	const passwordRegex =
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

	if (!password) {
		return "Password is required";
	}

	if (!passwordRegex.test(password)) {
		return "Password must be at least 8 characters, and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).";
	}

	return "";
};

// Password validation checks for dropdown
const getPasswordValidation = (password: string) => {
	return {
		length: password.length >= 8,
		lowercase: /[a-z]/.test(password),
		uppercase: /[A-Z]/.test(password),
		number: /\d/.test(password),
		special: /[@$!%*?&]/.test(password),
	};
};

const showPasswordValidation = ref(false);

const validateConfirmPassword = (password: string, confirmPassword: string) => {
	if (!confirmPassword) {
		return "Please confirm your password";
	}
	if (password !== confirmPassword) {
		return "Passwords do not match";
	}
	return "";
};

// Form submission
const handleSubmit = async () => {
	// Reset errors
	nameError.value = "";
	emailError.value = "";
	passwordError.value = "";
	confirmPasswordError.value = "";

	// Validate form
	nameError.value = validateName(name.value);
	emailError.value = validateEmail(email.value);
	passwordError.value = validatePassword(password.value);
	confirmPasswordError.value = validateConfirmPassword(
		password.value,
		confirmPassword.value,
	);

	// If there are errors, don't submit
	if (
		nameError.value ||
		emailError.value ||
		passwordError.value ||
		confirmPasswordError.value
	) {
		return;
	}

	// Start loading
	isLoading.value = true;

	try {
		// Make API call to backend
		const response = await fetch(
			`${import.meta.env.VITE_BACKEND_URL}/v1/users/register`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: name.value,
					email: email.value,
					password: password.value,
				}),
			},
		);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || "Registration failed");
		}

		alert("Registration successful! Please check your email for verification.");

		// Reset form
		name.value = "";
		email.value = "";
		password.value = "";
		confirmPassword.value = "";

		// You can redirect to login page here
		router.push("/login");
	} catch (error) {
		console.error("Signup failed:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "Registration failed. Please try again.";
		alert(`Registration failed: ${errorMessage}`);
	} finally {
		isLoading.value = false;
	}
};

// Input handlers with real-time validation
const handleNameInput = () => {
	if (nameError.value) {
		nameError.value = validateName(name.value);
	}
};

const handleEmailInput = () => {
	if (emailError.value) {
		emailError.value = validateEmail(email.value);
	}
};

const handlePasswordInput = () => {
	if (passwordError.value) {
		passwordError.value = validatePassword(password.value);
	}
	if (confirmPasswordError.value && confirmPassword.value) {
		confirmPasswordError.value = validateConfirmPassword(
			password.value,
			confirmPassword.value,
		);
	}
};

const handlePasswordFocus = () => {
	showPasswordValidation.value = true;
};

const handlePasswordBlur = () => {
	// Hide validation dropdown after a short delay
	setTimeout(() => {
		showPasswordValidation.value = false;
	}, 200);
};

const handleConfirmPasswordInput = () => {
	if (confirmPasswordError.value) {
		confirmPasswordError.value = validateConfirmPassword(
			password.value,
			confirmPassword.value,
		);
	}
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
          Create your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-300">
          Join thousands of users managing their finances better
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <!-- Username Input -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="name"
              v-model="name"
              type="text"
              autocomplete="username"
              required
              class="relative block w-full px-3 py-3 border border-gray-600 rounded-lg placeholder-gray-400 text-white bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all"
              :class="{ 'border-red-500 focus:ring-red-500 focus:border-red-500': nameError }"
              placeholder="Enter your username"
              @input="handleNameInput"
            />
            <p v-if="nameError" class="mt-1 text-sm text-red-500">
              {{ nameError }}
            </p>
          </div>

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
                autocomplete="new-password"
                required
                class="relative block w-full px-3 py-3 pr-10 border border-gray-600 rounded-lg placeholder-gray-400 text-white bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all"
                :class="{ 'border-red-500 focus:ring-red-500 focus:border-red-500': passwordError }"
                placeholder="Enter your password"
                @input="handlePasswordInput"
                @focus="handlePasswordFocus"
                @blur="handlePasswordBlur"
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

              <!-- Password Validation Dropdown -->
              <div
                v-if="showPasswordValidation && password"
                class="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20 p-3"
              >
                <div class="text-sm text-gray-300 mb-2 font-medium">Password Requirements:</div>
                <div class="space-y-1">
                  <div class="flex items-center space-x-2">
                    <svg
                      class="h-4 w-4"
                      :class="getPasswordValidation(password).length ? 'text-green-400' : 'text-gray-400'"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        v-if="getPasswordValidation(password).length"
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                      <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span
                      class="text-xs"
                      :class="getPasswordValidation(password).length ? 'text-green-400' : 'text-gray-400'"
                    >
                      At least 8 characters
                    </span>
                  </div>

                  <div class="flex items-center space-x-2">
                    <svg
                      class="h-4 w-4"
                      :class="getPasswordValidation(password).lowercase ? 'text-green-400' : 'text-gray-400'"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        v-if="getPasswordValidation(password).lowercase"
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                      <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span
                      class="text-xs"
                      :class="getPasswordValidation(password).lowercase ? 'text-green-400' : 'text-gray-400'"
                    >
                      One lowercase letter
                    </span>
                  </div>

                  <div class="flex items-center space-x-2">
                    <svg
                      class="h-4 w-4"
                      :class="getPasswordValidation(password).uppercase ? 'text-green-400' : 'text-gray-400'"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        v-if="getPasswordValidation(password).uppercase"
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                      <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span
                      class="text-xs"
                      :class="getPasswordValidation(password).uppercase ? 'text-green-400' : 'text-gray-400'"
                    >
                      One uppercase letter
                    </span>
                  </div>

                  <div class="flex items-center space-x-2">
                    <svg
                      class="h-4 w-4"
                      :class="getPasswordValidation(password).number ? 'text-green-400' : 'text-gray-400'"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        v-if="getPasswordValidation(password).number"
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                      <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span
                      class="text-xs"
                      :class="getPasswordValidation(password).number ? 'text-green-400' : 'text-gray-400'"
                    >
                      One number
                    </span>
                  </div>

                  <div class="flex items-center space-x-2">
                    <svg
                      class="h-4 w-4"
                      :class="getPasswordValidation(password).special ? 'text-green-400' : 'text-gray-400'"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        v-if="getPasswordValidation(password).special"
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                      <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span
                      class="text-xs"
                      :class="getPasswordValidation(password).special ? 'text-green-400' : 'text-gray-400'"
                    >
                      One special character (@$!%*?&)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="passwordError" class="mt-1 text-sm text-red-500">
              {{ passwordError }}
            </p>
          </div>

          <!-- Confirm Password Input -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div class="relative">
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                class="relative block w-full px-3 py-3 pr-10 border border-gray-600 rounded-lg placeholder-gray-400 text-white bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all"
                :class="{ 'border-red-500 focus:ring-red-500 focus:border-red-500': confirmPasswordError }"
                placeholder="Confirm your password"
                @input="handleConfirmPasswordInput"
              />
              <button
                type="button"
                tabindex="-1"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg
                  class="h-5 w-5 text-gray-400 hover:text-gray-300"
                  :class="{ 'text-gray-300': showConfirmPassword }"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    v-if="!showConfirmPassword"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    v-if="!showConfirmPassword"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                  <path
                    v-if="showConfirmPassword"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              </button>
            </div>
            <p v-if="confirmPasswordError" class="mt-1 text-sm text-red-500">
              {{ confirmPasswordError }}
            </p>
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
            {{ isLoading ? 'Creating Account...' : 'Create Account' }}
          </button>
        </div>

        <!-- Sign In Link -->
        <div class="text-center">
          <p class="text-sm text-gray-300">
            Already have an account?
            <router-link
              to="/login"
              class="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign in here
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
