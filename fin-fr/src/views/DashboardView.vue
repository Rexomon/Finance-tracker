<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            @click="logout"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <!-- Financial Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Income</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(totalIncome) }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(totalExpense) }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Current Balance</dt>
                    <dd class="text-lg font-medium" :class="currentBalance >= 0 ? 'text-green-600' : 'text-red-600'">
                      {{ formatCurrency(currentBalance) }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Budget Tracking -->
        <div class="bg-white shadow rounded-lg mb-8">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-900">Budget Tracking</h2>
          </div>
          <div class="p-6">
            <div v-if="processedBudgets.length === 0" class="text-center py-8">
              <p class="text-gray-500">No budget created for this month yet</p>
            </div>
            <div v-else class="space-y-4">
              <div v-for="budget in processedBudgets" :key="budget._id" class="border rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h3 class="font-medium text-gray-900">{{ budget.category.categoryName }}</h3>
                    <p class="text-sm text-gray-600">Limit: {{ formatCurrency(budget.originalLimit) }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">{{ formatCurrency(budget.spent) }}</p>
                    <p class="text-sm" :class="getBudgetStatusClass(budget.remaining)">
                    {{ getBudgetStatusText(budget.remaining) }}
                    </p>
                  </div>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-300"
                    :class="budget.percentage > 100 ? 'bg-red-600' : budget.percentage > 90 ? 'bg-red-500' : budget.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'"
                    :style="{ width: `${Math.min(budget.percentage, 100)}%` }"
                  ></div>
                </div>
                <p class="text-sm text-gray-600 mt-1">
                  {{ isNaN(budget.percentage) ? '0.0' : budget.percentage.toFixed(1) }}% used
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Expense by Category Chart -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Expenses by Category</h2>
            </div>
            <div class="p-6">
              <ExpenseChart :data="expenseByCategory" />
            </div>
          </div>

          <!-- Income vs Expense Trend -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Income vs Expenses Trend</h2>
            </div>
            <div class="p-6">
              <TrendChart :data="monthlyTrend" />
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="bg-white shadow rounded-lg mb-8">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-900">Recent Transactions</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="transaction in recentTransactions" :key="transaction._id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ transaction.description }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ transaction.category.categoryName }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(transaction.amount) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" :class="transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                      {{ transaction.type === 'income' ? 'Income' : 'Expense' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatDate(transaction.date) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                @click="openTransactionModal"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Transaction
              </button>
              <button
                @click="openCategoryModal"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
                Add Category
              </button>
              <button
                @click="openBudgetModal"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Create Budget
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Transaction Modal -->
    <TransactionModal
      :show="showTransactionModal"
      @close="closeTransactionModal"
      @transaction-added="onTransactionAdded"
      :categories="categories"
    />

    <!-- Category Modal -->
    <CategoryModal
      :show="showCategoryModal"
      @close="closeCategoryModal"
      @category-added="onCategoryAdded"
    />

    <!-- Budget Modal -->
    <BudgetModal
      :show="showBudgetModal"
      @close="closeBudgetModal"
      @budget-added="onBudgetAdded"
      :categories="expenseCategories"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import {
	checkAuthStatus,
	logout as authLogout,
	fetchWithAuth,
} from "../utils/auth";
import ExpenseChart from "../components/Dashboard/ExpenseChart.vue";
import TrendChart from "../components/Dashboard/TrendChart.vue";
import TransactionModal from "../components/Dashboard/TransactionModal.vue";
import CategoryModal from "../components/Dashboard/CategoryModal.vue";
import BudgetModal from "../components/Dashboard/BudgetModal.vue";

const router = useRouter();

// Reactive data
const transactions = ref<any[]>([]);
const budgets = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const showTransactionModal = ref(false);
const showCategoryModal = ref(false);
const showBudgetModal = ref(false);

// Computed properties

const currentMonthTransactions = computed(() => {
	const now = new Date();
	const currentMonth = now.getMonth() + 1;
	const currentYear = now.getFullYear();

	return transactions.value.filter((transaction) => {
		const transactionDate = new Date(transaction.date);
		return (
			transactionDate.getMonth() + 1 === currentMonth &&
			transactionDate.getFullYear() === currentYear
		);
	});
});

const totalIncome = computed(() => {
	return currentMonthTransactions.value
		.filter((t) => t.type === "income")
		.reduce((sum, t) => sum + t.amount, 0);
});

const totalExpense = computed(() => {
	return currentMonthTransactions.value
		.filter((t) => t.type === "expense")
		.reduce((sum, t) => sum + t.amount, 0);
});

const currentBalance = computed(() => totalIncome.value - totalExpense.value);

const recentTransactions = computed(() => transactions.value.slice(0, 10));

const expenseCategories = computed(() => {
	return categories.value.filter((cat) => cat.type === "expense");
});

const processedBudgets = computed(() => {
	return budgets.value.map((budget: any) => {
		const spent = currentMonthTransactions.value
			.filter(
				(t) => t.type === "expense" && t.category._id === budget.category._id,
			)
			.reduce((sum, t) => sum + t.amount, 0);

		const originalLimit = budget.limit + spent;
		const remaining = budget.limit;
		const percentage = budget.limit > 0 ? (spent / originalLimit) * 100 : 0;

		return {
			...budget,
			spent: Math.max(spent, 0),
			originalLimit: originalLimit,
			remaining: remaining,
			percentage: Math.max(percentage, 0),
		};
	});
});

const getBudgetStatusClass = (remaining: number) => {
	if (remaining > 0) return "text-green-600";
	if (remaining === 0) return "text-gray-600";
	return "text-red-600";
};

const getBudgetStatusText = (remaining: number) => {
	if (remaining > 0) return `Remaining: ${formatCurrency(remaining)}`;
	if (remaining === 0) return "Fully Used";
	return `Over: ${formatCurrency(Math.abs(remaining))}`;
};

const expenseByCategory = computed(() => {
	const categoryExpenses = new Map();

	currentMonthTransactions.value
		.filter((t) => t.type === "expense")
		.forEach((transaction) => {
			const categoryName = transaction.category.categoryName;
			const currentAmount = categoryExpenses.get(categoryName) || 0;
			categoryExpenses.set(categoryName, currentAmount + transaction.amount);
		});

	return Array.from(categoryExpenses.entries()).map(([name, amount]) => ({
		name,
		value: amount,
	}));
});

const monthlyTrend = computed(() => {
	const months = [];
	const now = new Date();

	for (let i = 5; i >= 0; i--) {
		const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthTransactions = transactions.value.filter((t) => {
			const tDate = new Date(t.date);
			return (
				tDate.getMonth() === date.getMonth() &&
				tDate.getFullYear() === date.getFullYear()
			);
		});

		const income = monthTransactions
			.filter((t) => t.type === "income")
			.reduce((sum, t) => sum + t.amount, 0);
		const expense = monthTransactions
			.filter((t) => t.type === "expense")
			.reduce((sum, t) => sum + t.amount, 0);

		months.push({
			month: date.toLocaleDateString("id-ID", {
				month: "short",
				year: "numeric",
			}),
			income,
			expense,
		});
	}

	return months;
});

// Methods
const fetchTransactions = async () => {
	try {
		const response = await fetchWithAuth(
			`${import.meta.env.VITE_BACKEND_URL}/v1/transactions`,
		);

		if (response.ok) {
			const data = await response.json();
			transactions.value = data.transactions || [];
		}
	} catch (error) {
		console.error("Error fetching transactions:", error);
	}
};

const fetchBudgets = async () => {
	try {
		const response = await fetchWithAuth(
			`${import.meta.env.VITE_BACKEND_URL}/v1/budgets`,
		);

		if (response.ok) {
			const data = await response.json();
			const budgetsData = data.budgets || [];

			// Filter budgets for current month and year
			const currentMonth = new Date().getMonth() + 1;
			const currentYear = new Date().getFullYear();

			const currentMonthBudgets = budgetsData.filter(
				(budget: any) =>
					budget.month === currentMonth && budget.year === currentYear,
			);

			// Store raw budget data, calculation will be done in computed property
			budgets.value = currentMonthBudgets;
		}
	} catch (error) {
		console.error("Error fetching budgets:", error);
	}
};

const fetchCategories = async () => {
	try {
		const response = await fetchWithAuth(
			`${import.meta.env.VITE_BACKEND_URL}/v1/categories`,
		);

		if (response.ok) {
			const data = await response.json();
			categories.value = data.categories || [];
		}
	} catch (error) {
		console.error("Error fetching categories:", error);
	}
};

const formatCurrency = (amount: number) => {
	// Handle NaN, undefined, or null values
	if (Number.isNaN(amount) || amount === null || amount === undefined) {
		amount = 0;
	}

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

const logout = async () => {
	await authLogout();
	router.push("/login");
};

// Modal methods
const openTransactionModal = () => {
	showTransactionModal.value = true;
};

const closeTransactionModal = () => {
	showTransactionModal.value = false;
};

const openCategoryModal = () => {
	showCategoryModal.value = true;
};

const closeCategoryModal = () => {
	showCategoryModal.value = false;
};

const openBudgetModal = () => {
	showBudgetModal.value = true;
};

const closeBudgetModal = () => {
	showBudgetModal.value = false;
};

// Event handlers
const onTransactionAdded = async () => {
	await fetchTransactions();
	await fetchBudgets();
	closeTransactionModal();
};

const onCategoryAdded = () => {
	fetchCategories();
	closeCategoryModal();
};

const onBudgetAdded = async () => {
	await fetchBudgets();
	closeBudgetModal();
};

// Initialize data
onMounted(async () => {
	// Check if user is authenticated
	const isAuthenticated = await checkAuthStatus();
	if (!isAuthenticated) {
		router.push("/login");
		return;
	}

	loading.value = true;

	// Load transactions and categories first
	await Promise.all([fetchTransactions(), fetchCategories()]);

	// Then load budgets after transactions are available
	await fetchBudgets();

	loading.value = false;
});
</script>
