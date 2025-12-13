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
          <h3 class="text-lg font-medium text-gray-900">Create Budget</h3>
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

        <form @submit.prevent="submitBudget" class="space-y-4">
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
              v-model.number="form.limit"
              type="number"
              required
              min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              placeholder="Enter budget limit"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Month</label
            >
            <select
              v-model="form.month"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
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
              v-model="form.year"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
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
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchWithAuth } from "../../../utils/auth";
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast, showErrorToast } = useGlobalToast();

interface Category {
  _id: string;
  categoryName: string;
  type: "expense" | "income";
}

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

// Local categories state
const categories = ref<Category[]>([]);
const categoriesLoading = ref(false);
const emit = defineEmits<{
  close: [];
  "budget-added": [];
}>();

const loading = ref(false);

// Fetch expense categories for dropdown
const fetchCategories = async () => {
  categoriesLoading.value = true;
  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/categories`,
    );

    if (response.ok) {
      const data = await response.json();
      // Filter only expense categories for budget
      categories.value = (data.categories || []).filter(
        (cat: Category) => cat.type === "expense",
      );
    } else {
      const error = await response.json();
      showErrorToast(error.message || "Failed to load categories");
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    showErrorToast("Failed to load categories");
  } finally {
    categoriesLoading.value = false;
  }
};

const form = ref({
  category: "",
  limit: 0,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
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

const submitBudget = async () => {
  loading.value = true;

  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/budgets`,
      {
        method: "POST",
        body: JSON.stringify({
          category: form.value.category,
          limit: form.value.limit,
          month: form.value.month,
          year: form.value.year,
        }),
      },
    );

    if (response.ok) {
      // Reset form
      form.value = {
        category: "",
        limit: 0,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      };

      emit("budget-added");
      showSuccessToast("Budget created successfully");
    } else {
      const error = await response.json();
      showErrorToast(
        error.message || "An error occurred while creating the budget",
      );
    }
  } catch (error) {
    console.error("Error creating budget:", error);
    showErrorToast("An error occurred while creating the budget");
  } finally {
    loading.value = false;
  }
};

// Watch for show prop changes to reset form and fetch categories
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      // Reset form when modal opens
      form.value = {
        category: "",
        limit: 0,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      };
      // Fetch categories when modal opens
      fetchCategories();
    }
  },
);
</script>
