<template>
  <v-app>
    <div class="animated-bg"></div>

    <!-- Sidebar Navigation Drawer -->
    <v-navigation-drawer
      permanent
      width="260"
      color="#0F0F12"
      class="border-r border-white border-opacity-5"
    >
      <!-- Brand Logo -->
      <div class="px-6 py-6 d-flex align-center">
        <v-avatar color="primary" variant="flat" size="32" class="mr-3 rounded-lg gradient-btn">
          <v-icon icon="mdi-video-vintage" color="white" size="18"></v-icon>
        </v-avatar>
        <span class="gradient-text text-h6 font-weight-black tracking-wide" style="font-family: 'Outfit', sans-serif;">Clipyzee AI</span>
      </div>

      <!-- Menu List -->
      <div class="px-3">
        <!-- Group 1: Tools -->
        <div class="text-caption font-weight-bold text-grey-darken-1 px-3 mb-2 mt-4 text-uppercase tracking-wider">Tools</div>
        <v-list density="compact" nav class="bg-transparent pa-0">
          <v-list-item
            v-for="item in createMenu"
            :key="item.value"
            :active="item.value === 'explore' ? route.path === '/explore' : route.path.startsWith('/studio')"
            :value="item.value"
            @click="navigateSidebar(item.value)"
            class="rounded-lg mb-1"
            selected-class="active-menu-item"
          >
            <template v-slot:prepend>
              <v-icon :icon="item.icon" size="20" class="mr-1"></v-icon>
            </template>
            <v-list-item-title class="font-weight-medium text-body-2">{{ item.title }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <!-- Group 2: Archive -->
        <div class="text-caption font-weight-bold text-grey-darken-1 px-3 mb-2 mt-6 text-uppercase tracking-wider">Archive</div>
        <v-list density="compact" nav class="bg-transparent pa-0">
          <v-list-item
            :active="route.path === '/my-creations'"
            value="my-creations"
            @click="navigateSidebar('my-creations')"
            class="rounded-lg mb-1"
            selected-class="active-menu-item"
          >
            <template v-slot:prepend>
              <v-icon icon="mdi-folder-play-outline" size="20" class="mr-1"></v-icon>
            </template>
            <v-list-item-title class="font-weight-medium text-body-2">My Creations</v-list-item-title>
          </v-list-item>
        </v-list>
      </div>
    </v-navigation-drawer>

    <!-- Top App Bar Header -->
    <v-app-bar
      color="#0F0F12"
      elevation="0"
      height="70"
      class="border-b border-white border-opacity-5 px-4"
    >
      <!-- Tabs in header -->
      <v-btn-toggle
        v-model="activeHeaderTab"
        mandatory
        variant="flat"
        bg-color="transparent"
        selected-class="text-primary font-weight-black"
        class="header-toggle-tabs"
      >
        <v-btn value="create" class="text-none font-weight-medium px-4 text-subtitle-1">Create</v-btn>
        <v-btn value="publish" class="text-none font-weight-medium px-4 text-subtitle-1" @click="showFeatureModal('Publishing Manager')">Publish</v-btn>
      </v-btn-toggle>

      <v-spacer></v-spacer>

      <!-- Right side elements -->
      <v-btn
        variant="text"
        prepend-icon="mdi-comment-question-outline"
        class="text-none text-grey-lighten-1 mr-2"
        @click="showFeatureModal('Feedback Portal')">
        Feedback
      </v-btn>

      <!-- Coin Credit Badge -->
      <v-chip
        variant="outlined"
        color="primary"
        class="mr-4 px-3 font-weight-bold"
        prepend-icon="mdi-lightning-bolt"
        style="border-color: rgba(255, 107, 74, 0.3) !important;"
      >
        100 Credits
      </v-chip>

      <!-- Profile Avatar -->
      <v-avatar color="primary" size="36" class="cursor-pointer gradient-btn border border-white border-opacity-20">
        <span class="text-subtitle-2 font-weight-black text-white">J</span>
      </v-avatar>
    </v-app-bar>

    <!-- Main Content Panel -->
    <v-main class="bg-background relative-content">
      <v-container class="pt-8 pb-12 px-6" fluid>
        <!-- Vue Router View -->
        <router-view />
      </v-container>
    </v-main>

    <!-- Extraction Overlay -->
    <v-overlay v-model="isExtractingVideo" class="align-center justify-center" persistent scrim="#000" opacity="0.8">
      <div class="text-center pa-6 rounded-lg bg-black bg-opacity-80 border border-white border-opacity-10 text-white" style="max-width: 320px; z-index: 10000;">
        <v-progress-circular indeterminate color="primary" size="64" class="mb-4"></v-progress-circular>
        <div class="text-subtitle-1 font-weight-bold mb-1">Preparing Raw Clip</div>
        <div class="text-caption text-grey">{{ extractionProgress }}</div>
      </div>
    </v-overlay>

    <!-- Feature Coming Soon Dialog -->
    <v-dialog v-model="featureModal" max-width="400px">
      <v-card class="glass-card text-center pa-6 rounded-xl border border-white border-opacity-10 text-white" style="background: #111116 !important;">
        <v-avatar color="rgba(255, 107, 74, 0.1)" size="72" class="mb-4 mx-auto border border-primary border-opacity-25">
          <v-icon icon="mdi-wrench-clock" color="primary" size="36"></v-icon>
        </v-avatar>
        <h3 class="text-h5 font-weight-black mb-2" style="font-family: 'Outfit', sans-serif;">{{ activeFeatureName }}</h3>
        <p class="text-body-2 text-grey mb-6">This feature is currently in active development on the Clipyzee engine. Stay tuned for updates!</p>
        <v-btn color="primary" class="gradient-btn font-weight-bold rounded-lg block w-100" @click="featureModal = false">
          Awesome
        </v-btn>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from './composables/useWorkspace'

const route = useRoute()
const router = useRouter()

const { isExtractingVideo, extractionProgress } = useWorkspace()

const activeHeaderTab = ref('create')
const featureModal = ref(false)
const activeFeatureName = ref('')

const showFeatureModal = (featureName: string) => {
  activeFeatureName.value = featureName
  featureModal.value = true
}

const createMenu = [
  { title: 'Explore Dashboard', value: 'explore', icon: 'mdi-compass-outline' },
  { title: 'AI Clipping Studio', value: 'ai-video', icon: 'mdi-movie-creation-outline' }
]

const navigateSidebar = (tab: string) => {
  if (tab === 'explore') {
    router.push('/explore')
  } else if (tab === 'ai-video') {
    router.push('/studio/import')
  } else if (tab === 'my-creations') {
    router.push('/my-creations')
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Outfit:wght@400;600;700;900&display=swap');

html, body, .v-application {
  font-family: 'Inter', sans-serif !important;
}

.font-monospace {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.glass-card {
  background: rgba(17, 24, 39, 0.7) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.glass-header {
  background: rgba(11, 15, 25, 0.8) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.gradient-text {
  background: linear-gradient(to right, #FF6B4A, #FF3B96);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-btn {
  background: linear-gradient(45deg, #FF6B4A, #FF3B96) !important;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.gradient-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -6px rgba(255, 107, 74, 0.6);
}

.animated-bg {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 0;
  background: radial-gradient(circle at 15% 50%, rgba(255, 107, 74, 0.1), transparent 25%),
              radial-gradient(circle at 85% 30%, rgba(255, 59, 150, 0.1), transparent 25%);
  pointer-events: none;
  animation: pulse-bg 15s infinite alternate ease-in-out;
}

@keyframes pulse-bg {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.1); opacity: 1; }
}

.relative-content {
  position: relative;
  z-index: 1;
}

.hover-item {
  transition: background 0.2s ease, transform 0.2s ease;
}

.hover-item:hover {
  background: rgba(255, 255, 255, 0.03);
  transform: translateX(4px);
}

.active-menu-item {
  background: linear-gradient(90deg, rgba(255, 107, 74, 0.12) 0%, rgba(255, 59, 150, 0.12) 100%) !important;
  color: #FF6B4A !important;
  border-left: 3px solid #FF6B4A;
}

.hover-scale-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.hover-scale-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 24px rgba(255, 107, 74, 0.2) !important;
}

.header-toggle-tabs .v-btn {
  border-radius: 0 !important;
  border-bottom: 2px solid transparent;
  color: #9E9E9E !important;
}

.header-toggle-tabs .v-btn--active {
  background: transparent !important;
  border-bottom: 2px solid #FF6B4A !important;
  color: #FFFFFF !important;
}

.style-preset-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border-radius: 8px !important;
}
.style-preset-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08) !important;
}
.style-preview-text {
  font-size: 12px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
}
.style-preview-text.default {
  color: #FFFF00; /* Yellow */
  font-family: 'Arial Black', sans-serif;
  text-shadow: 2px 2px 0px #000;
  background: #222;
}
.style-preview-text.cyberpunk {
  color: #00FF00; /* Neon Green */
  font-family: 'Impact', sans-serif;
  text-shadow: 2px 2px 0px #000;
  background: #111;
}
.style-preview-text.cute {
  color: #FF00FF; /* Pink */
  font-family: 'Comic Sans MS', sans-serif;
  text-shadow: 1px 1px 0px #82004B;
  background: #fff;
}
.style-preview-text.minimalist {
  color: #00FFFF; /* Cyan */
  font-family: 'Arial', sans-serif;
  background: rgba(0,0,0,0.8);
  border: 1px solid #00FFFF;
}
.timeline-track::-webkit-scrollbar {
  height: 6px;
}
.timeline-track::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.timeline-track::-webkit-scrollbar-thumb {
  background: rgba(255, 107, 74, 0.3);
  border-radius: 3px;
}
.timeline-track::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 107, 74, 0.6);
}
.timeline-block {
  border-left: 4px solid #FF6B4A !important;
}
.timeline-block.active-block {
  border-left: 4px solid #FF3B96 !important;
}
</style>
