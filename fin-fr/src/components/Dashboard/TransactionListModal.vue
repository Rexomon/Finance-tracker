<template>
  <div v-if="show" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-6 mx-auto p-6 border w-full max-w-6xl shadow-lg rounded-lg bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-gray-900">Transaction List</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="overflow-y-auto" style="max-height: calc(190vh - 120px)">

          <!-- Filter Controls -->
          <div class="mb-6 flex flex-wrap gap-4">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
              <select v-model="filterType"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm appearance-none text-gray-700"
                style="background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 4 5\'><path fill=\'%23666\' d=\'M2 0L0 2h4zm0 5L0 3h4z\'/></svg>'); background-repeat: no-repeat; background-position: right 12px center; background-size: 12px; padding-right: 40px;">
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
              <select v-model="filterCategory"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm appearance-none text-gray-700"
                style="background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 4 5\'><path fill=\'%23666\' d=\'M2 0L0 2h4zm0 5L0 3h4z\'/></svg>'); background-repeat: no-repeat; background-position: right 12px center; background-size: 12px; padding-right: 40px;">
                <option value="">All Categories</option>
                <option v-for="category in uniqueCategories" :key="category._id" :value="category._id">
                  {{ category.categoryName }}
                </option>
              </select>
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input v-model="searchQuery" type="text" placeholder="Search description..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" />
            </div>
          </div>

          <!-- Transaction Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="transaction in paginatedTransactions" :key="transaction._id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(transaction.date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                    {{ transaction.description }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ transaction.category.categoryName }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="transaction.type === 'income'
                      ? 'inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'
                      : 'inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800'">
                      {{ transaction.type }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                    :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'">
                    {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button @click="editTransaction(transaction)" class="text-blue-600 hover:text-blue-900 mr-4 p-1"
                      title="Edit Transaction">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                        </path>
                      </svg>
                    </button>
                    <button @click="deleteTransaction(transaction._id)" class="text-red-600 hover:text-red-900 p-1"
                      title="Delete Transaction">
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

          <div v-if="filteredTransactions.length === 0" class="text-center py-8">
            <p class="text-gray-500">No transactions found</p>
          </div>

          <!-- Pagination -->
          <div class="mt-6 flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage,
                filteredTransactions.length) }} of {{ filteredTransactions.length }} transactions
            </div>
            <div class="flex gap-3">
              <button @click="currentPage--" :disabled="currentPage === 1"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <span class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <button @click="currentPage++" :disabled="currentPage === totalPages"
                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Next
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
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast, showErrorToast, showInfoToast, showWarnToast } =
	useGlobalToast();

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

interface Props {
	show: boolean;
	transactions: Transaction[];
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

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Computed properties
const uniqueCategories = computed(() => {
	const categories = new Map();
	props.transactions.forEach((transaction) => {
		if (!categories.has(transaction.category._id)) {
			categories.set(transaction.category._id, transaction.category);
		}
	});
	return Array.from(categories.values());
});

const filteredTransactions = computed(() => {
	let filtered = [...props.transactions];

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

	// Sort by date (newest first)
	return filtered.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);
});

const totalPages = computed(() => {
	return Math.ceil(filteredTransactions.value.length / itemsPerPage.value);
});

const paginatedTransactions = computed(() => {
	const start = (currentPage.value - 1) * itemsPerPage.value;
	const end = start + itemsPerPage.value;
	return filteredTransactions.value.slice(start, end);
});

// Methods
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

// Reset filters when modal opens
watch(
	() => props.show,
	(newShow) => {
		if (newShow) {
			filterType.value = "";
			filterCategory.value = "";
			searchQuery.value = "";
			currentPage.value = 1;
		}
	},
);

// Reset pagination when filters change
watch([filterType, filterCategory, searchQuery], () => {
	currentPage.value = 1;
});
</script>
