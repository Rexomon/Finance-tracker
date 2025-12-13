<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div
      class="relative top-6 mx-auto p-6 border w-full max-w-6xl shadow-lg rounded-lg bg-white"
    >
      <div class="mt-3">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-gray-900">Transaction List</h3>
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
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Filter by Type</label
              >
              <select
                v-model="filterType"
                :disabled="isLoading"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm appearance-none text-gray-700 select-arrow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Filter by Category</label
              >
              <select
                v-model="filterCategory"
                :disabled="isLoading"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm appearance-none text-gray-700 select-arrow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Categories</option>
                <option
                  v-for="category in uniqueCategories"
                  :key="category._id"
                  :value="category._id"
                >
                  {{ category.categoryName }}
                </option>
              </select>
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Search</label
              >
              <input
                v-model="searchQuery"
                :disabled="isLoading"
                type="text"
                placeholder="Search description..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="flex justify-center items-center py-12">
            <div
              class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"
            ></div>
            <span class="ml-3 text-gray-600">Loading transactions...</span>
          </div>

          <!-- Transaction Table -->
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Amount
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
                  v-for="transaction in filteredTransactions"
                  :key="transaction._id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(transaction.date) }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate"
                  >
                    {{ transaction.description }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ transaction.category.categoryName }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="
                        transaction.type === 'income'
                          ? 'inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'
                          : 'inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800'
                      "
                    >
                      {{ transaction.type }}
                    </span>
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                    :class="
                      transaction.type === 'income'
                        ? 'text-green-600'
                        : 'text-red-600'
                    "
                  >
                    {{ transaction.type === "income" ? "+" : "-"
                    }}{{ formatCurrency(transaction.amount) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click="editTransaction(transaction)"
                      class="text-blue-600 hover:text-blue-900 mr-4 p-1"
                      title="Edit Transaction"
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
                      @click="deleteTransaction(transaction._id)"
                      class="text-red-600 hover:text-red-900 p-1"
                      title="Delete Transaction"
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

          <div
            v-if="!isLoading && filteredTransactions.length === 0"
            class="text-center py-8"
          >
            <p class="text-gray-500">No transactions found</p>
          </div>

          <!-- Pagination -->
          <div
            v-if="!isLoading && metadata.totalCount > 0"
            class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <!-- Left: Info -->
            <div class="text-sm text-gray-700">
              Showing
              {{ (metadata.page - 1) * metadata.pageSize + 1 }} to
              {{
                Math.min(metadata.page * metadata.pageSize, metadata.totalCount)
              }}
              of {{ metadata.totalCount }} transactions
            </div>

            <!-- Center: Go to Page Input -->
            <div class="flex items-center gap-2">
              <label class="text-sm text-gray-700">Go to page:</label>
              <input
                v-model.number="goToPageInput"
                @keyup.enter="handleGoToPage"
                :disabled="isLoading"
                type="number"
                :min="1"
                :max="metadata.totalPages"
                class="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-center"
                placeholder="#"
              />
              <button
                @click="handleGoToPage"
                :disabled="isLoading || !isValidPageInput"
                class="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Go
              </button>
            </div>

            <!-- Right: Navigation Controls -->
            <div class="flex items-center gap-2">
              <!-- First Page Button -->
              <button
                @click="goToPage(1)"
                :disabled="metadata.page === 1 || isLoading"
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
                @click="goToPage(metadata.page - 1)"
                :disabled="metadata.page === 1 || isLoading"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <!-- Page Info -->
              <span
                class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg"
              >
                Page {{ metadata.page }} of {{ metadata.totalPages }}
              </span>

              <!-- Next Button -->
              <button
                @click="goToPage(metadata.page + 1)"
                :disabled="metadata.page === metadata.totalPages || isLoading"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>

              <!-- Last Page Button -->
              <button
                @click="goToPage(metadata.totalPages)"
                :disabled="metadata.page === metadata.totalPages || isLoading"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchWithAuth } from "../../../utils/auth";
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast } = useGlobalToast();

interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: {
    _id: string;
    categoryName: string;
    type: "income" | "expense";
  };
  date: string;
}

interface TransactionMetadata {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  "edit-transaction": [transaction: Transaction];
  "delete-transaction": [transactionId: string];
}>();

// Filter states
const filterType = ref("");
const filterCategory = ref("");
const searchQuery = ref("");

// Pagination and loading states
const isLoading = ref(false);
const localTransactions = ref<Transaction[]>([]);
const metadata = ref<TransactionMetadata>({
  totalCount: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
});

// Go to page input
const goToPageInput = ref<number | null>(null);

// Computed properties
const uniqueCategories = computed(() => {
  // Get unique categories from local transactions
  const categories = new Map();
  localTransactions.value.forEach((transaction) => {
    if (transaction.category && !categories.has(transaction.category._id)) {
      categories.set(transaction.category._id, transaction.category);
    }
  });
  return Array.from(categories.values());
});

// Validate go to page input
const isValidPageInput = computed(() => {
  return (
    goToPageInput.value !== null &&
    goToPageInput.value >= 1 &&
    goToPageInput.value <= metadata.value.totalPages
  );
});

// Filter transactions locally (for client-side filtering after server fetch)
const filteredTransactions = computed(() => {
  let filtered = [...localTransactions.value];

  // Filter by type
  if (filterType.value) {
    filtered = filtered.filter((t) => t.type === filterType.value);
  }

  // Filter by category
  if (filterCategory.value) {
    filtered = filtered.filter((t) => t.category._id === filterCategory.value);
  }

  // Search in description
  if (searchQuery.value) {
    filtered = filtered.filter((t) =>
      t.description.toLowerCase().includes(searchQuery.value.toLowerCase()),
    );
  }

  return filtered;
});

// Methods
const fetchTransactions = async (page: number = 1) => {
  isLoading.value = true;

  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/transactions?page=${page}&pageSize=10`,
    );

    if (response.ok) {
      const data = await response.json();
      const transactionsData = data.transactions;

      if (transactionsData?.data) {
        localTransactions.value = transactionsData.data;
        metadata.value = transactionsData.metadata;
      } else {
        localTransactions.value = [];
        metadata.value = {
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        };
      }
    } else {
      console.error("Error fetching transactions:", response.status);
      localTransactions.value = [];
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
    localTransactions.value = [];
  } finally {
    isLoading.value = false;
  }
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= metadata.value.totalPages && !isLoading.value) {
    fetchTransactions(page);
  }
};

const handleGoToPage = () => {
  if (isValidPageInput.value && goToPageInput.value !== null) {
    goToPage(goToPageInput.value);
    goToPageInput.value = null;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const editTransaction = (transaction: Transaction) => {
  emit("edit-transaction", transaction);
};

const deleteTransaction = (transactionId: string) => {
  if (confirm("Are you sure you want to delete this transaction?")) {
    emit("delete-transaction", transactionId);
    showSuccessToast("Transaction deleted successfully");
  }
};

// Watch for modal open/close to fetch or reset data
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      // Reset filters and fetch fresh data when modal opens
      filterType.value = "";
      filterCategory.value = "";
      searchQuery.value = "";
      goToPageInput.value = null;
      fetchTransactions(1);
    }
  },
);
</script>

<style scoped>
.select-arrow {
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3E%3Cpath fill='%23666' d='M2 0L0 2h4zm0 5L0 3h4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
  padding-right: 40px;
}

/* Hide number input arrows */
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
