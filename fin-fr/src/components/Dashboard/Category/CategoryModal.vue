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
            {{ props.editMode ? "Edit Category" : "Add Category" }}
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

        <form @submit.prevent="submitCategory" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Category Name</label
            >
            <input
              v-model="form.categoryName"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Type</label
            >
            <select
              v-model="form.type"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Choose Type</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
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
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {{ loading ? "Saving..." : props.editMode ? "Update" : "Save" }}
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

const { showSuccessToast, showErrorToast, showInfoToast, showWarnToast } =
  useGlobalToast();

interface Category {
  _id: string;
  categoryName: string;
  type: "income" | "expense";
}

interface Props {
  show: boolean;
  category?: Category;
  editMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editMode: false,
});

const emit = defineEmits<{
  close: [];
  "category-added": [];
  "category-updated": [];
}>();

const loading = ref(false);
const form = ref({
  categoryName: "",
  type: "",
});

const submitCategory = async () => {
  loading.value = true;

  try {
    const url = props.editMode
      ? `${import.meta.env.VITE_BACKEND_URL}/v1/categories/${props.category?._id}`
      : `${import.meta.env.VITE_BACKEND_URL}/v1/categories`;

    const method = props.editMode ? "PATCH" : "POST";

    const response = await fetchWithAuth(url, {
      method,
      body: JSON.stringify({
        categoryName: form.value.categoryName,
        type: form.value.type,
      }),
    });

    if (response.ok) {
      // Reset form
      form.value = {
        categoryName: "",
        type: "",
      };

      if (props.editMode) {
        emit("category-updated");
      } else {
        emit("category-added");
      }

      showSuccessToast(
        `Category ${props.editMode ? "updated" : "added"} successfully`,
      );
    } else {
      const error = await response.json();
      showErrorToast(
        error.message ||
          `An error occurred while ${props.editMode ? "updating" : "adding"} category`,
      );
    }
  } catch (error) {
    console.error(
      `Error ${props.editMode ? "updating" : "adding"} category:`,
      error,
    );
    showErrorToast(
      `An error occurred while ${props.editMode ? "updating" : "adding"} category`,
    );
  } finally {
    loading.value = false;
  }
};

// Watch for show prop changes to reset form
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      // Reset form or populate with category data
      if (props.editMode && props.category) {
        form.value = {
          categoryName: props.category.categoryName,
          type: props.category.type,
        };
      } else {
        form.value = {
          categoryName: "",
          type: "",
        };
      }
    }
  },
);
</script>
