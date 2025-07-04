<template>
  <div v-if="show" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Add Transaction</h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitTransaction" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              v-model="form.description"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter transaction description"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              v-model.number="form.amount"
              type="number"
              required
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              v-model="form.type"
              @change="filterCategories"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose Type</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              v-model="form.category"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose Category</option>
              <option
                v-for="category in filteredCategories"
                :key="category._id"
                :value="category._id"
              >
                {{ category.categoryName }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              v-model="form.date"
              type="date"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchWithAuth } from "../../utils/auth";

interface Category {
	_id: string;
	categoryName: string;
	type: "income" | "expense";
}

interface Props {
	show: boolean;
	categories: Category[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
	close: [];
	"transaction-added": [];
}>();

const loading = ref(false);
const form = ref({
	description: "",
	amount: 0,
	type: "",
	category: "",
	date: new Date().toISOString().split("T")[0],
});

const filteredCategories = ref<Category[]>([]);

const filterCategories = () => {
	if (form.value.type) {
		filteredCategories.value = props.categories.filter(
			(cat) => cat.type === form.value.type,
		);
	} else {
		filteredCategories.value = [];
	}
	form.value.category = ""; // Reset category selection
};

const submitTransaction = async () => {
	loading.value = true;

	try {
		const response = await fetchWithAuth(
			`${import.meta.env.VITE_BACKEND_URL}/v1/transactions`,
			{
				method: "POST",
				body: JSON.stringify({
					description: form.value.description,
					amount: form.value.amount,
					type: form.value.type,
					category: form.value.category,
					date: form.value.date,
				}),
			},
		);

		if (response.ok) {
			// Reset form
			form.value = {
				description: "",
				amount: 0,
				type: "",
				category: "",
				date: new Date().toISOString().split("T")[0],
			};
			filteredCategories.value = [];

			emit("transaction-added");
		} else {
			const error = await response.json();
			alert(error.message || "An error occurred while adding transaction");
		}
	} catch (error) {
		console.error("Error adding transaction:", error);
		alert("An error occurred while adding transaction");
	} finally {
		loading.value = false;
	}
};

// Watch for show prop changes to reset form
watch(
	() => props.show,
	(newShow) => {
		if (newShow) {
			// Reset form when modal opens
			form.value = {
				description: "",
				amount: 0,
				type: "",
				category: "",
				date: new Date().toISOString().split("T")[0],
			};
			filteredCategories.value = [];
		}
	},
);
</script>
