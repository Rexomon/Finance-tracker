<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { checkAuthStatus, logout as authLogout } from "../../utils/auth";
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast } = useGlobalToast();

const isMenuOpen = ref(false);
const isLoggedIn = ref(false);
const router = useRouter();

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const checkAuth = async () => {
  const authenticated = await checkAuthStatus();
  isLoggedIn.value = authenticated;
};

const logout = async () => {
  await authLogout();
  isLoggedIn.value = false;
  showSuccessToast("You have been logged out successfully");
  router.push("/login");
};

onMounted(() => {
  checkAuth();
});
</script>

<template>
  <nav class="bg-gray-900 py-4">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <router-link to="/" class="text-white font-bold text-xl"
            >Finance Tracker</router-link
          >
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <button @click="toggleMenu" class="text-white p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                v-if="!isMenuOpen"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Desktop menu -->
        <div class="hidden md:flex items-center space-x-8">
          <a
            href="#features"
            class="text-gray-300 hover:text-white transition-colors"
            >Features</a
          >
          <a
            href="#pricing"
            class="text-gray-300 hover:text-white transition-colors"
            >Pricing</a
          >
          <a
            href="#testimonials"
            class="text-gray-300 hover:text-white transition-colors"
            >Testimonials</a
          >
          <a
            href="#faq"
            class="text-gray-300 hover:text-white transition-colors"
            >FAQ</a
          >

          <!-- Show different menu items based on login status -->
          <template v-if="isLoggedIn">
            <router-link
              to="/dashboard"
              class="text-gray-300 hover:text-white transition-colors"
            >
              Dashboard
            </router-link>
            <button
              @click="logout"
              class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer"
            >
              Logout
            </button>
          </template>

          <template v-else>
            <router-link
              to="/login"
              class="text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </router-link>
            <router-link
              to="/signup"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer"
            >
              Sign Up
            </router-link>
          </template>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="isMenuOpen" class="md:hidden mt-4 space-y-4 py-4">
        <a
          href="#features"
          class="block text-gray-300 hover:text-white transition-colors"
          >Features</a
        >
        <a
          href="#pricing"
          class="block text-gray-300 hover:text-white transition-colors"
          >Pricing</a
        >
        <a
          href="#testimonials"
          class="block text-gray-300 hover:text-white transition-colors"
          >Testimonials</a
        >
        <a
          href="#faq"
          class="block text-gray-300 hover:text-white transition-colors"
          >FAQ</a
        >

        <!-- Show different menu items based on login status -->
        <template v-if="isLoggedIn">
          <router-link
            to="/dashboard"
            class="block text-gray-300 hover:text-white transition-colors"
          >
            Dashboard
          </router-link>
          <button
            @click="logout"
            class="block w-full text-left bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer"
          >
            Logout
          </button>
        </template>

        <template v-else>
          <router-link
            to="/login"
            class="block text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </router-link>
          <router-link
            to="/signup"
            class="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer text-center"
          >
            Sign Up
          </router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Any custom styles here */
</style>
