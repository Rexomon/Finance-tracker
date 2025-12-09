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
          <h3 class="text-xl font-semibold text-gray-900">
            Categories Management
          </h3>
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

        <div class="mb-6">
          <div class="flex items-center space-x-4">
            <button
              @click="filterType = 'all'"
              :class="
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              "
              class="px-4 py-3 rounded-lg text-sm font-medium hover:bg-blue-500 hover:text-white transition-colors"
            >
              All Categories
            </button>
            <button
              @click="filterType = 'income'"
              :class="
                filterType === 'income'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              "
              class="px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-500 hover:text-white transition-colors"
            >
              Income
            </button>
            <button
              @click="filterType = 'expense'"
              :class="
                filterType === 'expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              "
              class="px-4 py-3 rounded-lg text-sm font-medium hover:bg-red-500 hover:text-white transition-colors"
            >
              Expense
            </button>
          </div>
        </div>

        <div class="overflow-x-auto max-h-100">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category Name
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
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
                v-for="category in filteredCategories"
                :key="category._id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="editingCategory === category._id">
                    <input
                      v-model="editForm.categoryName"
                      type="text"
                      maxlength="50"
                      pattern="[a-zA-Z0-9\s\-_]+"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      @keyup.enter="saveCategory(category._id)"
                      @keyup.esc="cancelEdit"
                    />
                  </div>
                  <div v-else class="text-sm text-gray-900">
                    {{ category.categoryName }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="editingCategory === category._id">
                    <select
                      v-model="editForm.type"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div v-else>
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="
                        category.type === 'income'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      "
                    >
                      {{ category.type === "income" ? "Income" : "Expense" }}
                    </span>
                  </div>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2"
                >
                  <div
                    v-if="editingCategory === category._id"
                    class="flex space-x-2"
                  >
                    <button
                      @click="saveCategory(category._id)"
                      :disabled="loading"
                      class="text-green-600 hover:text-green-900 disabled:opacity-50"
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
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    </button>
                    <button
                      @click="cancelEdit"
                      class="text-gray-600 hover:text-gray-900"
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
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  </div>
                  <div v-else class="flex space-x-2">
                    <button
                      @click="startEdit(category)"
                      class="text-blue-600 hover:text-blue-900"
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
                      @click="deleteCategory(category._id)"
                      :disabled="loading"
                      class="text-red-600 hover:text-red-900 disabled:opacity-50"
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
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredCategories.length === 0" class="text-center py-12">
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              ></path>
            </svg>
            <p class="mt-2 text-sm">No categories found</p>
            <p class="text-xs text-gray-400 mt-1">
              Create your first category to get started
            </p>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fetchWithAuth } from "../../../utils/auth";
import { useGlobalToast } from "@/composables/useGlobalToast";

const { showSuccessToast, showErrorToast, showInfoToast, showWarnToast } =
  useGlobalToast();

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
  "edit-category": [category: Category];
  "delete-category": [categoryId: string];
}>();

const loading = ref(false);
const editingCategory = ref<string | null>(null);
const filterType = ref<"all" | "income" | "expense">("all");
const editForm = ref({
  categoryName: "",
  type: "income" as "income" | "expense",
});

const filteredCategories = computed(() => {
  if (!props.categories || props.categories.length === 0) {
    return [];
  }
  if (filterType.value === "all") {
    return props.categories;
  }
  return props.categories.filter((cat) => cat.type === filterType.value);
});

const startEdit = (category: Category) => {
  editingCategory.value = category._id;
  editForm.value = {
    categoryName: category.categoryName,
    type: category.type,
  };
};

const cancelEdit = () => {
  editingCategory.value = null;
  editForm.value = {
    categoryName: "",
    type: "income",
  };
};

const saveCategory = async (categoryId: string) => {
  loading.value = true;

  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/categories/${categoryId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          categoryName: editForm.value.categoryName,
          type: editForm.value.type,
        }),
      },
    );

    if (response.ok) {
      emit("edit-category", {
        _id: categoryId,
        categoryName: editForm.value.categoryName,
        type: editForm.value.type,
      });

      cancelEdit();

      showSuccessToast("Category updated successfully");
    } else {
      const error = await response.json();
      showErrorToast(error.message || "Failed to update category");
    }
  } catch (error) {
    console.error("Error updating category:", error);
    showErrorToast("An error occurred while updating category");
  } finally {
    loading.value = false;
  }
};

const deleteCategory = async (categoryId: string) => {
  if (loading.value) return;

  if (!confirm("Are you sure you want to delete this category?")) {
    return;
  }

  loading.value = true;

  try {
    const response = await fetchWithAuth(
      `${import.meta.env.VITE_BACKEND_URL}/v1/categories/${categoryId}`,
      {
        method: "DELETE",
      },
    );

    if (response.ok) {
      emit("delete-category", categoryId);
      showSuccessToast("Category deleted successfully");
    } else {
      const error = await response.json();
      showErrorToast(error.message || "Failed to delete category");
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    showErrorToast("An error occurred while deleting category");
  } finally {
    loading.value = false;
  }
};

// Watch for show prop changes to reset state
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      cancelEdit();
      filterType.value = "all";
    }
  },
);
</script>
