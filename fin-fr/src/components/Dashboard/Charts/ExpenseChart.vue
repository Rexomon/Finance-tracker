<template>
  <div class="expense-chart">
    <div v-if="data.length === 0" class="text-center py-8">
      <p class="text-gray-500">No expense have been made this month</p>
    </div>
    <div v-else class="relative overflow-hidden">
      <!-- Simple pie chart using CSS -->
      <div class="flex flex-col space-y-4">
        <div class="flex justify-center">
          <svg width="200" height="200" class="transform -rotate-90">
            <circle
              v-for="(item, index) in chartData"
              :key="index"
              :cx="100"
              :cy="100"
              :r="80"
              fill="none"
              :stroke="colors[index % colors.length]"
              :stroke-width="20"
              :stroke-dasharray="`${(item.percentage * 2 * Math.PI * 80) / 100} ${2 * Math.PI * 80}`"
              :stroke-dashoffset="calculateOffset(index)"
              class="transition-all duration-300"
            />
          </svg>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap justify-center gap-4">
          <div
            v-for="(item, index) in chartData"
            :key="index"
            class="flex items-center space-x-2"
          >
            <div
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: colors[index % colors.length] }"
            ></div>
            <span class="text-sm text-gray-700 !text-gray-700">
              {{ item.name }} ({{ item.percentage.toFixed(1) }}%)
            </span>
          </div>
        </div>

        <!-- Data list -->
        <div class="space-y-2">
          <div
            v-for="(item, index) in chartData"
            :key="index"
            class="flex justify-between items-center p-2 bg-gray-50 rounded"
          >
            <div class="flex items-center space-x-2">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: colors[index % colors.length] }"
              ></div>
              <span class="text-sm font-medium !text-gray-900">{{
                item.name
              }}</span>
            </div>
            <span class="text-sm text-gray-600 !text-gray-600">{{
              formatCurrency(item.value)
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface ChartData {
  name: string;
  value: number;
}

interface Props {
  data: ChartData[];
}

const props = defineProps<Props>();

const colors = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // yellow
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange
  "#6B7280", // gray
];

const totalValue = computed(() => {
  return props.data.reduce((sum, item) => sum + item.value, 0);
});

const chartData = computed(() => {
  return props.data.map((item) => ({
    ...item,
    percentage: (item.value / totalValue.value) * 100,
  }));
});

const calculateOffset = (index: number) => {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    const item = chartData.value[i];
    if (item) {
      offset += (item.percentage * 2 * Math.PI * 80) / 100;
    }
  }
  return -offset;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
};
</script>

<style scoped>
.expense-chart {
  width: 100%;
}
</style>
