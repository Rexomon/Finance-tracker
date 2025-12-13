<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div
      class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
    >
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">
            {{ editMode ? "Edit Transaction" : "Add Transaction" }}
          </h3>
          <button
            @click="$emit('close')"
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

        <form @submit.prevent="submitTransaction" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Description</label
            >
            <input
              v-model="form.description"
              type="text"
              required
              minlength="1"
              maxlength="256"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Enter transaction description"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Amount</label
            >
            <input
              v-model.number="form.amount"
              type="number"
              required
              min="0.01"
              step="0.01"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Type</label
            >
            <select
              v-model="form.type"
              @change="onTypeChange"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            >
              <option value="">Choose Type</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Category</label
            >
            <select
              v-model="form.category"
              required
              :disabled="categoriesLoading"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 disabled:bg-gray-100"
            >
              <option value="">
                {{ categoriesLoading ? "Loading..." : "Choose Category" }}
              </option>
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
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Date</label
            >
            <input
              v-model="form.date"
              type="date"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              style="color: rgb(17, 24, 39) !important; color-scheme: light"
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
              {{
                loading
                  ? editMode
                    ? "Updating..."
                    : "Saving..."
                  : editMode
                    ? "Update"
                    : "Save"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { fetchWithAuth } from "../../../utils/auth";
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast, showErrorToast } = useGlobalToast();

interface Category {
  _id: string;
  categoryName: string;
  type: "income" | "expense";
}

interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: Category;
  date: string;
}

interface Props {
  show: boolean;
  editMode?: boolean;
  transaction?: Transaction;
}

const props = defineProps<Props>();

// Local categories state
const categories = ref<Category[]>([]);
const categoriesLoading = ref(false);
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

// Fetch categories from API
const fetchCategories = async () => {
  categoriesLoading.value = true;
  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/categories`,
    );

    if (response.ok) {
      const data = await response.json();
      categories.value = data.categories || [];
      // Apply filter if type is already selected
      if (form.value.type) {
        filterCategories(false);
      }
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    showErrorToast("Failed to load categories");
  } finally {
    categoriesLoading.value = false;
  }
};

// Called when user manually changes type dropdown
const onTypeChange = () => {
  filterCategories(true);
};

const filterCategories = (resetCategory = false) => {
  if (form.value.type) {
    filteredCategories.value = categories.value.filter(
      (cat) => cat.type === form.value.type,
    );
  } else {
    filteredCategories.value = [];
  }
  if (resetCategory) {
    form.value.category = ""; // Reset category selection
  }
};

const submitTransaction = async () => {
  loading.value = true;

  try {
    const url = props.editMode
      ? `${import.meta.env.VITE_BACKEND_URL}/v1/transactions/${props.transaction?._id}`
      : `${import.meta.env.VITE_BACKEND_URL}/v1/transactions`;

    const method = props.editMode ? "PUT" : "POST";

    // Convert date string to ISO format for backend
    const dateValue = new Date(form.value.date || new Date());

    const response = await fetchWithAuth(url, {
      method,
      body: JSON.stringify({
        description: form.value.description,
        amount: form.value.amount,
        type: form.value.type,
        category: form.value.category,
        date: dateValue.toISOString(),
      }),
    });

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

      showSuccessToast(
        `Transaction ${props.editMode ? "updated" : "added"} successfully`,
      );
    } else {
      const error = await response.json();
      showErrorToast(
        error.message ||
          `An error occurred while ${props.editMode ? "updating" : "adding"} transaction`,
      );
    }
  } catch (error) {
    console.error(
      `Error ${props.editMode ? "updating" : "adding"} transaction:`,
      error,
    );
    showErrorToast(
      `An error occurred while ${props.editMode ? "updating" : "adding"} transaction`,
    );
  } finally {
    loading.value = false;
  }
};

// Watch for show prop changes to reset form and fetch categories
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      // Fetch categories when modal opens
      fetchCategories();

      if (props.editMode && props.transaction) {
        // Populate form with transaction data for editing
        form.value = {
          description: props.transaction.description,
          amount: props.transaction.amount,
          type: props.transaction.type,
          category: props.transaction.category._id,
          date: props.transaction.date.split("T")[0], // Format date for input
        };
      } else {
        // Reset form for new transaction
        form.value = {
          description: "",
          amount: 0,
          type: "",
          category: "",
          date: new Date().toISOString().split("T")[0],
        };
        filteredCategories.value = [];
      }
    }
  },
);
</script>
