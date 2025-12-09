<script setup lang="ts">
const features = [
  {
    title: "Expense Tracking",
    description:
      "Easily log your daily expenses and categorize them for better financial awareness.",
    icon: "📊",
  },
  {
    title: "Budget Management",
    description:
      "Create and manage budgets for different expense categories to stay on track.",
    icon: "💰",
  },
  {
    title: "Financial Reports",
    description:
      "Get insightful reports and visualizations of your spending habits over time.",
    icon: "📈",
  },
  {
    title: "Goal Setting",
    description:
      "Set savings goals and track your progress towards achieving them.",
    icon: "🎯",
  },
];
</script>

<template>
  <section class="py-16 bg-gray-900">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold text-center text-white mb-12">Key Features</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div v-for="(feature, index) in features" :key="index" class="bg-gray-800 p-6 rounded-lg hover:transform hover:scale-105 transition-all duration-300">
          <div class="text-4xl mb-4">{{ feature.icon }}</div>
          <h3 class="text-xl font-bold text-white mb-2">{{ feature.title }}</h3>
          <p class="text-gray-300">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
