<script setup lang="ts">
</script>

<template>
  <footer class="bg-gray-900 py-12">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 class="text-xl font-bold text-white mb-4">Finance Tracker</h3>
          <p class="text-gray-400">Your personal finance management tool designed to help you save more and spend wisely.</p>
        </div>

        <div>
          <h4 class="font-bold text-white mb-4">Features</h4>
          <ul class="space-y-2 text-gray-400">
            <li><a href="#" class="hover:text-white">Expense Tracking</a></li>
            <li><a href="#" class="hover:text-white">Budget Management</a></li>
            <li><a href="#" class="hover:text-white">Financial Reports</a></li>
            <li><a href="#" class="hover:text-white">Goal Setting</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-bold text-white mb-4">Company</h4>
          <ul class="space-y-2 text-gray-400">
            <li><a href="#" class="hover:text-white">About Us</a></li>
            <li><a href="#" class="hover:text-white">Careers</a></li>
            <li><a href="#" class="hover:text-white">Blog</a></li>
            <li><a href="#" class="hover:text-white">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-bold text-white mb-4">Legal</h4>
          <ul class="space-y-2 text-gray-400">
            <li><a href="#" class="hover:text-white">Privacy Policy</a></li>
            <li><a href="#" class="hover:text-white">Terms of Service</a></li>
            <li><a href="#" class="hover:text-white">Cookie Policy</a></li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 mt-12 pt-6 text-center text-gray-400">
        <p>&copy; {{ new Date().getFullYear() }} Finance Tracker. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>
