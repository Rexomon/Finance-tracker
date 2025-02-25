<script setup lang="ts">
const testimonials = [
	{
		name: "John Doe",
		role: "Small Business Owner",
		quote:
			"This finance tracker has completely transformed how I manage my business expenses. Highly recommended!",
		avatar: "https://placehold.co/100/252525/FFFFFF/png?text=JD",
	},
	{
		name: "Sarah Smith",
		role: "Freelancer",
		quote:
			"I finally have clarity on my finances as a freelancer. The reports help me make better financial decisions.",
		avatar: "https://placehold.co/100/252525/FFFFFF/png?text=SS",
	},
	{
		name: "Michael Brown",
		role: "Student",
		quote:
			"As a student on a tight budget, this app helps me track every expense and save money each month.",
		avatar: "https://placehold.co/100/252525/FFFFFF/png?text=MB",
	},
];
</script>

<template>
  <section class="py-16">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold text-center text-white mb-12">What Our Users Say</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div v-for="(testimonial, index) in testimonials" :key="index" class="bg-gray-800 p-6 rounded-lg">
          <div class="flex items-center mb-4">
            <img :src="testimonial.avatar" :alt="testimonial.name" class="w-12 h-12 rounded-full mr-4" />
            <div>
              <h4 class="font-bold text-white">{{ testimonial.name }}</h4>
              <p class="text-gray-400 text-sm">{{ testimonial.role }}</p>
            </div>
          </div>
          <p class="text-gray-300 italic">"{{ testimonial.quote }}"</p>
        </div>
      </div>
    </div>
  </section>
</template>
