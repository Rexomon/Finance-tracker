<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const handleGetStarted = () => {
	router.push("/signup");
};
</script>

<template>
  <section class="py-16 bg-blue-600">
    <div class="container mx-auto px-4 text-center">
      <h2 class="text-3xl font-bold text-white mb-4">Ready to Take Control of Your Finances?</h2>
      <p class="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
        Join thousands of users who have transformed their financial habits with our finance tracker app.
      </p>
      <button
        @click="handleGetStarted"
        class="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all text-lg cursor-pointer"
      >
        Get Started for Free
      </button>
      <p class="text-white/80 mt-4">No credit card required. Free 14-day trial.</p>
    </div>
  </section>
</template>
