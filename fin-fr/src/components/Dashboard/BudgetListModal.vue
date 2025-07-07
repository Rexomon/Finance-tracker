<template>
  <div v-if="show" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Budget Management</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="mb-4">
          <div class="flex items-center space-x-4">
            <button @click="filterPeriod = 'current'"
              :class="filterPeriod === 'current' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'"
              class="px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors">
              Current Month
            </button>
            <button @click="filterPeriod = 'all'"
              :class="filterPeriod === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'"
              class="px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors">
              All Budgets
            </button>
          </div>
        </div>

        <div class="overflow-x-auto max-h-100">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget Limit
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="budget in filteredBudgets" :key="budget._id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z">
                          </path>
                        </svg>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ budget.category.categoryName }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ budget.category.type }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(budget.limit) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ getMonthName(budget.month) }} {{ budget.year }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button @click="deleteBudget(budget._id)" :disabled="loading"
                    class="text-red-600 hover:text-red-900 disabled:opacity-50">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                      </path>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredBudgets.length === 0" class="text-center py-8">
          <div class="text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
              </path>
            </svg>
            <p class="mt-2">No budgets found</p>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <button @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchWithAuth } from "../../utils/auth";
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast, showErrorToast, showInfoToast, showWarnToast } =
	useGlobalToast();

interface Budget {
	_id: string;
	category: {
		_id: string;
		categoryName: string;
		type: string;
	};
	limit: number;
	month: number;
	year: number;
}

interface Props {
	show: boolean;
	budgets: Budget[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
	close: [];
	"delete-budget": [budgetId: string];
}>();

const loading = ref(false);
const filterPeriod = ref<"current" | "all">("current");

const filteredBudgets = computed(() => {
	if (filterPeriod.value === "current") {
		const now = new Date();
		const currentMonth = now.getMonth() + 1;
		const currentYear = now.getFullYear();

		return props.budgets.filter(
			(budget) => budget.month === currentMonth && budget.year === currentYear,
		);
	}
	return props.budgets;
});

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
	}).format(amount);
};

const getMonthName = (month: number) => {
	const date = new Date(2000, month - 1, 1);
	return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
};

const deleteBudget = async (budgetId: string) => {
	if (!confirm("Are you sure you want to delete this budget?")) {
		return;
	}

	loading.value = true;

	try {
		const response = await fetchWithAuth(
			`${import.meta.env.VITE_BACKEND_URL}/v1/budgets/${budgetId}`,
			{
				method: "DELETE",
			},
		);

		if (response.ok) {
			emit("delete-budget", budgetId);
			showSuccessToast("Budget deleted successfully");
		} else {
			const error = await response.json();
			showErrorToast(error.message || "Failed to delete budget");
		}
	} catch (error) {
		console.error("Error deleting budget:", error);
		showErrorToast("An error occurred while deleting budget");
	} finally {
		loading.value = false;
	}
};

// Watch for show prop changes to reset state
watch(
	() => props.show,
	(newShow) => {
		if (newShow) {
			filterPeriod.value = "current";
		}
	},
);
</script>
