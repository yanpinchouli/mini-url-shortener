<script setup lang="ts">
import { ref } from "vue";
const url = ref("");
</script>

<template>
  <div class="app-wrapper">
    <el-container>
      <el-header class="custom-header">
        <h1 class="header-title">
          MINI <span class="subtitle">URL SHORTENER</span>
        </h1>
      </el-header>

      <el-main class="main-content">
        <el-input
          v-model="url"
          placeholder="Paste the long URL and make it MINI..."
          size="large"
          clearable
        >
        </el-input>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.custom-header {
  padding: 1rem;
}

.header-title {
  font-family: "Inter", sans-serif;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #303133;
  margin: 0;
  user-select: none;
  text-align: center;
}

.subtitle {
  font-weight: 400;
  font-size: 1.2rem;
  letter-spacing: 0.05em;
  color: #fff;
}

.main-content {
  width: 30em;
  margin: 0 auto;
}
</style>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;800&display=swap");

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background-color: rgb(207, 167, 205);
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
}
</style>
