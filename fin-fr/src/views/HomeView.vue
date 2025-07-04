<script setup lang="ts">
import CTASection from "../components/Home/CTASection.vue";
import FeaturesSection from "../components/Home/FeaturesSection.vue";
import FooterSection from "../components/Home/FooterSection.vue";
import HeroSection from "../components/Home/HeroSection.vue";
import NavBar from "../components/Home/NavBar.vue";
</script>

<template>
  <div class="finance-tracker-app">
    <NavBar />
    <main>
      <HeroSection />
      <FeaturesSection />
      <CTASection />
    </main>
    <FooterSection />
  </div>
</template>

<style scoped>
.finance-tracker-app {
  background-color: black;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}
</style>
