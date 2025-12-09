<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div
      class="relative top-6 mx-auto p-6 border w-full max-w-5xl shadow-lg rounded-lg bg-white"
    >
      <div class="mt-3">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-gray-900">Budget Management</h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div class="overflow-y-auto" style="max-height: calc(190vh - 120px)">
          <!-- Filter Controls -->
          <div class="mb-6 flex flex-wrap gap-4">
            <div class="flex items-center space-x-4">
              <button
                @click="setFilter('current')"
                :disabled="fetchLoading"
                :class="
                  filterPeriod === 'current'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                "
                class="px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Current Month
              </button>
              <button
                @click="setFilter('all')"
                :disabled="fetchLoading"
                :class="
                  filterPeriod === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                "
                class="px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                All Budgets
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="fetchLoading"
            class="flex justify-center items-center py-12"
          >
            <div
              class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"
            ></div>
            <span class="ml-3 text-gray-600">Loading budgets...</span>
          </div>

          <!-- Budget Table -->
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Budget Limit
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Period
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="budget in displayedBudgets"
                  :key="budget._id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="shrink-0 h-10 w-10">
                        <div
                          class="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center"
                        >
                          <svg
                            class="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          {{
                            budget.category?.categoryName || "Unknown Category"
                          }}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{ budget.category?.type || "expense" }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-purple-600">
                      {{ formatCurrency(budget.limit) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                    >
                      {{ getMonthName(budget.month) }} {{ budget.year }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click="startEditBudget(budget)"
                      :disabled="loading"
                      class="text-blue-600 hover:text-blue-900 mr-4 p-1 disabled:opacity-50"
                      title="Edit Budget"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      @click="deleteBudget(budget._id)"
                      :disabled="loading"
                      class="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
                      title="Delete Budget"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div
            v-if="!fetchLoading && displayedBudgets.length === 0"
            class="text-center py-12"
          >
            <div class="text-gray-500">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                ></path>
              </svg>
              <p class="mt-2 text-sm">No budgets found</p>
              <p class="text-xs text-gray-400 mt-1">
                {{
                  filterPeriod === "current"
                    ? "Try viewing all budgets or create a new one"
                    : "Create your first budget to get started"
                }}
              </p>
            </div>
          </div>

          <!-- Budget Count Info -->
          <div
            v-if="
              !fetchLoading &&
              (displayedBudgets.length > 0 || pagination.totalCount > 0)
            "
            class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <!-- Left: Info -->
            <div class="text-sm text-gray-700">
              <template v-if="filterPeriod === 'current'">
                Showing {{ currentMonthBudgets.length }} budget{{
                  currentMonthBudgets.length !== 1 ? "s" : ""
                }}
                for current month
                <span v-if="pagination.totalCount > 0" class="text-gray-500">
                  ({{ pagination.totalCount }} total)
                </span>
              </template>
              <template v-else>
                Showing
                {{ (pagination.page - 1) * pagination.pageSize + 1 }} to
                {{
                  Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.totalCount,
                  )
                }}
                of {{ pagination.totalCount }} budgets
              </template>
            </div>

            <!-- Center: Go to Page Input -->
            <div
              v-if="filterPeriod === 'all' && pagination.totalPages > 1"
              class="flex items-center gap-2"
            >
              <label class="text-sm text-gray-700">Go to page:</label>
              <input
                v-model.number="goToPageInput"
                @keyup.enter="handleGoToPage"
                :disabled="fetchLoading"
                type="number"
                :min="1"
                :max="pagination.totalPages"
                class="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-center"
                placeholder="#"
              />
              <button
                @click="handleGoToPage"
                :disabled="fetchLoading || !isValidPageInput"
                class="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Go
              </button>
            </div>

            <!-- Right: Navigation Controls -->
            <div
              v-if="filterPeriod === 'all' && pagination.totalPages > 1"
              class="flex items-center gap-2"
            >
              <!-- First Page Button -->
              <button
                @click="goToPage(1)"
                :disabled="pagination.page === 1 || fetchLoading"
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First Page"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  ></path>
                </svg>
              </button>

              <!-- Previous Button -->
              <button
                @click="goToPage(pagination.page - 1)"
                :disabled="pagination.page === 1 || fetchLoading"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <!-- Page Info -->
              <span
                class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg"
              >
                Page {{ pagination.page }} of {{ pagination.totalPages }}
              </span>

              <!-- Next Button -->
              <button
                @click="goToPage(pagination.page + 1)"
                :disabled="
                  pagination.page === pagination.totalPages || fetchLoading
                "
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>

              <!-- Last Page Button -->
              <button
                @click="goToPage(pagination.totalPages)"
                :disabled="
                  pagination.page === pagination.totalPages || fetchLoading
                "
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last Page"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Edit Budget Modal -->
        <div
          v-if="showEditModal"
          class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60"
        >
          <div
            class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
          >
            <div class="mt-3">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">Edit Budget</h3>
                <button
                  @click="cancelEdit"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>

              <form @submit.prevent="updateBudget" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Category</label
                  >
                  <select
                    v-model="editForm.category"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                  >
                    <option value="">Choose Category</option>
                    <option
                      v-for="category in categories"
                      :key="category._id"
                      :value="category._id"
                    >
                      {{ category.categoryName }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Budget Limit</label
                  >
                  <input
                    v-model.number="editForm.limit"
                    type="number"
                    required
                    min="1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                    placeholder="Enter budget limit"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Month</label
                  >
                  <select
                    v-model="editForm.month"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                  >
                    <option value="">Choose Month</option>
                    <option
                      v-for="month in months"
                      :key="month.value"
                      :value="month.value"
                    >
                      {{ month.label }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Year</label
                  >
                  <select
                    v-model="editForm.year"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                  >
                    <option value="">Choose Year</option>
                    <option v-for="year in years" :key="year" :value="year">
                      {{ year }}
                    </option>
                  </select>
                </div>

                <div class="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    @click="cancelEdit"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="loading"
                    class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {{ loading ? "Updating..." : "Update" }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchWithAuth } from "../../../utils/auth";
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast, showErrorToast } = useGlobalToast();

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

interface Category {
  _id: string;
  categoryName: string;
  type: string;
}

interface BudgetPagination {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Props {
  show: boolean;
  categories: Category[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  "budget-updated": [];
}>();

const loading = ref(false);
const fetchLoading = ref(false);
const filterPeriod = ref<"current" | "all">("current");
const showEditModal = ref(false);
const editingBudgetId = ref<string>("");
const budgets = ref<Budget[]>([]);
const pagination = ref<BudgetPagination>({
  totalCount: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
});

// Go to page input
const goToPageInput = ref<number | null>(null);

const editForm = ref({
  category: "",
  limit: 0,
  month: 0,
  year: 0,
});

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const years = computed(() => {
  const currentYear = new Date().getFullYear();
  const yearsArray = [];
  for (let i = currentYear - 1; i <= currentYear + 5; i++) {
    yearsArray.push(i);
  }
  return yearsArray;
});

const isValidPageInput = computed(() => {
  return (
    goToPageInput.value !== null &&
    goToPageInput.value >= 1 &&
    goToPageInput.value <= pagination.value.totalPages &&
    goToPageInput.value !== pagination.value.page
  );
});

// Client-side filtered budgets for "Current Month"
const currentMonthBudgets = computed(() => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return budgets.value.filter(
    (budget) => budget.month === currentMonth && budget.year === currentYear,
  );
});

const displayedBudgets = computed(() => {
  if (filterPeriod.value === "current") {
    return currentMonthBudgets.value;
  }
  return budgets.value;
});

const fetchBudgets = async (page: number = 1, pageSize: number = 10) => {
  fetchLoading.value = true;

  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/budgets?page=${page}&pageSize=${pageSize}`,
    );

    if (response.ok) {
      const data = await response.json();
      const budgetsResponse = data.budgets;

      if (budgetsResponse?.data) {
        budgets.value = budgetsResponse.data;
        pagination.value = budgetsResponse.metadata;
      } else if (Array.isArray(budgetsResponse)) {
        // Fallback for array response
        budgets.value = budgetsResponse;
        pagination.value = {
          totalCount: budgetsResponse.length,
          page: 1,
          pageSize: budgetsResponse.length,
          totalPages: 1,
        };
      } else {
        budgets.value = [];
        pagination.value = {
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        };
      }
    } else {
      const error = await response.json();
      showErrorToast(error.message || "Failed to fetch budgets");
      budgets.value = [];
    }
  } catch (error) {
    console.error("Error fetching budgets:", error);
    showErrorToast("An error occurred while fetching budgets");
    budgets.value = [];
  } finally {
    fetchLoading.value = false;
  }
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    fetchBudgets(page, pagination.value.pageSize);
  }
};

const handleGoToPage = () => {
  if (isValidPageInput.value && goToPageInput.value !== null) {
    goToPage(goToPageInput.value);
    goToPageInput.value = null;
  }
};

const setFilter = (filter: "current" | "all") => {
  filterPeriod.value = filter;
  // No need to fetch again - filtering is done client-side
  // Data is already fetched when modal opens
};

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
      showSuccessToast("Budget deleted successfully");
      await fetchBudgets(pagination.value.page, pagination.value.pageSize);
      emit("budget-updated");
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

const startEditBudget = (budget: Budget) => {
  editingBudgetId.value = budget._id;
  editForm.value = {
    category: budget.category._id,
    limit: budget.limit,
    month: budget.month,
    year: budget.year,
  };
  showEditModal.value = true;
};

const cancelEdit = () => {
  showEditModal.value = false;
  editingBudgetId.value = "";
  editForm.value = {
    category: "",
    limit: 0,
    month: 0,
    year: 0,
  };
};

const updateBudget = async () => {
  loading.value = true;

  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/budgets/${editingBudgetId.value}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          category: editForm.value.category,
          limit: editForm.value.limit,
          month: editForm.value.month,
          year: editForm.value.year,
        }),
      },
    );

    if (response.ok) {
      cancelEdit();
      showSuccessToast("Budget updated successfully");
      await fetchBudgets(pagination.value.page, pagination.value.pageSize);
      emit("budget-updated");
    } else {
      const error = await response.json();
      showErrorToast(error.message || "Failed to update budget");
    }
  } catch (error) {
    console.error("Error updating budget:", error);
    showErrorToast("An error occurred while updating budget");
  } finally {
    loading.value = false;
  }
};

// Watch for show prop changes to fetch data and reset state
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      filterPeriod.value = "current";
      goToPageInput.value = null;
      pagination.value = {
        totalCount: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      };
      // Fetch with larger pageSize to get more data for client-side filtering
      fetchBudgets(1, 50);
    }
  },
);
</script>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
