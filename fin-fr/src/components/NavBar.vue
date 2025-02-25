<script setup lang="ts">
import { ref } from "vue";

const isMenuOpen = ref(false);

const toggleMenu = () => {
	isMenuOpen.value = !isMenuOpen.value;
};
</script>

<template>
  <nav class="bg-gray-900 py-4">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <a href="/" class="text-white font-bold text-xl">Finance Tracker</a>
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <button @click="toggleMenu" class="text-white p-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!isMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Desktop menu -->
        <div class="hidden md:flex items-center space-x-8">
          <a href="#features" class="text-gray-300 hover:text-white transition-colors">Features</a>
          <a href="#pricing" class="text-gray-300 hover:text-white transition-colors">Pricing</a>
          <a href="#testimonials" class="text-gray-300 hover:text-white transition-colors">Testimonials</a>
          <a href="#faq" class="text-gray-300 hover:text-white transition-colors">FAQ</a>
          <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer">Sign Up</button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="isMenuOpen" class="md:hidden mt-4 space-y-4 py-4">
        <a href="#features" class="block text-gray-300 hover:text-white transition-colors">Features</a>
        <a href="#pricing" class="block text-gray-300 hover:text-white transition-colors">Pricing</a>
        <a href="#testimonials" class="block text-gray-300 hover:text-white transition-colors">Testimonials</a>
        <a href="#faq" class="block text-gray-300 hover:text-white transition-colors">FAQ</a>
        <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer">Sign Up</button>
      </div>
    </div>
  </nav>
</template>
