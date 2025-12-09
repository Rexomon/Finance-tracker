<template>
  <div class="trend-chart">
    <div v-if="data.length === 0" class="text-center py-8">
      <p class="text-gray-500">No data to display</p>
    </div>
    <div v-else class="relative overflow-hidden">
      <!-- Simple bar chart -->
      <div class="bg-gray-50 rounded p-4 mb-4">
        <div class="flex items-end justify-between" style="height: 240px;">
          <div
            v-for="(item, index) in data"
            :key="index"
            class="flex flex-col items-center space-y-2 flex-1 mx-1"
          >
            <!-- Bar container -->
            <div class="flex items-end justify-center space-x-1 h-48">
              <!-- Income bar -->
              <div class="relative bg-gray-200 rounded-t flex flex-col justify-end" style="width: 16px; height: 180px;">
                <div
                  class="bg-green-500 rounded-t transition-all duration-300 w-full"
                  :style="{ height: `${getBarHeight(item.income, maxValue)}px` }"
                ></div>
              </div>

              <!-- Expense bar -->
              <div class="relative bg-gray-200 rounded-t flex flex-col justify-end" style="width: 16px; height: 180px;">
                <div
                  class="bg-red-500 rounded-t transition-all duration-300 w-full"
                  :style="{ height: `${getBarHeight(item.expense, maxValue)}px` }"
                ></div>
              </div>
            </div>

            <!-- Month label -->
            <div class="text-center mt-2">
              <p class="text-xs text-gray-600 font-medium">{{ item.month }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex justify-center space-x-6 mb-4">
        <div class="flex items-center space-x-2">
          <div class="w-4 h-4 bg-green-500 rounded"></div>
          <span class="text-sm text-gray-700">Income</span>
        </div>
        <div class="flex items-center space-x-2">
          <div class="w-4 h-4 bg-red-500 rounded"></div>
          <span class="text-sm text-gray-700">Expenses</span>
        </div>
      </div>

      <!-- Data summary -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-50 p-4 rounded">
          <h4 class="font-medium text-gray-900 mb-2">Total Income (6 Months)</h4>
          <p class="text-lg font-semibold text-green-600">{{ formatCurrency(totalIncome) }}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded">
          <h4 class="font-medium text-gray-900 mb-2">Total Expenses (6 Months)</h4>
          <p class="text-lg font-semibold text-red-600">{{ formatCurrency(totalExpense) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface TrendData {
  month: string;
  income: number;
  expense: number;
}

interface Props {
  data: TrendData[];
}

const props = defineProps<Props>();

const maxValue = computed(() => {
  const allValues = props.data.flatMap((item) => [item.income, item.expense]);
  return Math.max(...allValues, 1);
});

const totalIncome = computed(() => {
  return props.data.reduce((sum, item) => sum + item.income, 0);
});

const totalExpense = computed(() => {
  return props.data.reduce((sum, item) => sum + item.expense, 0);
});

const getBarHeight = (value: number, max: number) => {
  return Math.max((value / max) * 160, 2); // Reduced max height to 160px for better fit
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
};
</script>

<style scoped>
.trend-chart {
  width: 100%;
}
</style>
