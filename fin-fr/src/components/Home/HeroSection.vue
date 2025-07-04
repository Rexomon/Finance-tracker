<script setup lang="ts">
</script>

<template>
  <section class="py-12 md:py-24">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row items-center">
        <div class="md:w-1/2">
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
            Take Control of Your Finances
          </h1>
          <p class="text-xl text-gray-300 mb-6">
            Track expenses, manage budgets, and achieve your financial goals with our easy-to-use finance tracker.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <router-link
              to="/signup"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all cursor-pointer text-center"
            >
              Get Started
            </router-link>
            <button class="bg-transparent border border-white text-white font-bold py-3 px-6 rounded-lg hover:bg-white hover:text-black transition-all cursor-pointer">
              Learn More
            </button>
          </div>
        </div>
        <div class="md:w-1/2 mt-10 md:mt-0">
          <img src="https://placehold.co/600x400/252525/FFFFFF/png?text=Finance+Dashboard" alt="Finance Dashboard" class="rounded-lg shadow-lg" />
        </div>
      </div>
    </div>
  </section>
</template>
