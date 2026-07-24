<template>
  <div>
    <h2 class="text-h4 font-weight-bold text-white mb-1" style="font-family: 'Outfit', sans-serif;">What would you like to create today?</h2>
    <p class="text-body-1 text-grey mb-8">Choose a pipeline template or tools workflow to begin your AI generation.</p>

    <!-- Quick Action Grid -->
    <v-row class="mb-8">
      <v-col cols="12" sm="6" md="6" v-for="card in quickCards" :key="card.title">
        <v-card
          :style="{ background: card.gradient }"
          class="rounded-xl pa-4 text-white hover-scale-card cursor-pointer d-flex flex-column justify-space-between relative-content"
          style="height: 140px; overflow: hidden;"
          @click="onQuickCardClick(card)"
        >
          <v-icon :icon="card.icon" size="28" class="align-self-start opacity-80"></v-icon>
          <div>
            <div class="font-weight-black text-h6 text-uppercase tracking-wider" style="line-height: 1.2;">{{ card.title }}</div>
            <div class="text-caption opacity-75 mt-0.5">Start workspace</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Featured Banner Showcase Carousel -->
    <v-card class="mb-8 overflow-hidden rounded-xl border border-white border-opacity-5" style="background: linear-gradient(100deg, #13131A 0%, #0F0F12 100%); height: 260px;" elevation="4">
      <v-window v-model="bannerIndex" show-arrows class="h-100">
        <v-window-item v-for="(b, i) in bannerSlides" :key="i" class="h-100">
          <div class="d-flex h-100 pa-8 align-center relative-content justify-space-between">
            <!-- Text Section -->
            <div style="max-width: 60%; z-index: 2;">
              <v-chip color="primary" variant="flat" size="x-small" class="font-weight-bold mb-3 px-2 text-uppercase tracking-widest">{{ b.subtitle }}</v-chip>
              <h1 class="text-h4 font-weight-black text-white mb-2" style="line-height: 1.2; font-family: 'Outfit', sans-serif;">{{ b.title }}</h1>
              <p class="text-body-2 text-grey mb-4" style="max-width: 480px;">{{ b.desc }}</p>
              <v-btn color="primary" class="gradient-btn px-6 font-weight-bold rounded-lg text-none" @click="onBannerAction(b)">
                {{ b.btnText }}
              </v-btn>
            </div>
            <!-- Right Graphic placeholder -->
            <v-avatar color="rgba(255,255,255,0.02)" size="140" class="mr-8 border border-white border-opacity-5">
              <v-icon icon="mdi-creation" color="primary" size="48"></v-icon>
            </v-avatar>
            <!-- Visual Gradient Orb background -->
            <div class="visual-orb" :style="{ background: b.orbColor, position: 'absolute', right: '-5%', top: '-20%', width: '300px', height: '300px', filter: 'blur(100px)', opacity: '0.15', borderRadius: '50%' }"></div>
          </div>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- AI Tools Grid -->
    <div class="text-h6 font-weight-black text-white mb-4 d-flex align-center mt-6" style="font-family: 'Outfit', sans-serif;">
      <v-icon icon="mdi-creation" color="primary" class="mr-2" size="small"></v-icon>
      Core Features
    </div>
    <v-row>
      <v-col cols="12" sm="6" md="3" v-for="t in aiToolsList" :key="t.title">
        <v-card
          class="pa-4 bg-surface rounded-xl border border-white border-opacity-5 hover-item text-center cursor-pointer d-flex flex-column align-center justify-center relative-content"
          style="height: 180px;"
          @click="$emit('show-feature', t.title)"
        >
          <v-avatar color="rgba(255,255,255,0.02)" size="48" class="mb-3 border border-white border-opacity-5">
            <v-icon :icon="t.icon" color="primary" size="20"></v-icon>
          </v-avatar>
          <div class="text-subtitle-2 font-weight-bold text-white mb-1">{{ t.title }}</div>
          <div class="text-caption text-grey" style="line-height: 1.3;">{{ t.desc }}</div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

defineEmits<{
  (e: 'show-feature', featureName: string): void;
}>()

const router = useRouter()
const bannerIndex = ref(0)

const quickCards = [
  { title: 'AI Clipping Studio', icon: 'mdi-movie-creation-outline', gradient: 'linear-gradient(135deg, #FF6B4A 0%, #FF3B96 100%)', tab: 'ai-video' },
  { title: 'Subtitle Stylist', icon: 'mdi-format-size', gradient: 'linear-gradient(135deg, #FF963B 0%, #FF3B3B 100%)', tab: 'ai-video' }
]

const bannerSlides = [
  {
    subtitle: 'AI Engine Active',
    title: 'Clipyzee Clipping Studio',
    desc: 'Extract viral vertical shorts from long YouTube videos automatically using advanced AI transcript breakdown.',
    btnText: 'Start Analysis',
    orbColor: '#FF3B96',
    action: 'ai-video'
  },
  {
    subtitle: 'ASS Styling Compiler',
    title: 'Word-Level Color Stylist',
    desc: 'Select individual spoken words to colorize them with outline shadows, or toggle preset subtitle skins.',
    btnText: 'Open Editor Workspace',
    orbColor: '#3B96FF',
    action: 'ai-video'
  },
  {
    subtitle: 'Native HTML5 Player',
    title: 'Dynamic Pan & Scan Crop',
    desc: 'Drag the video frame directly on the player to follow speakers horizontally. FFmpeg does the rest.',
    btnText: 'Try Drag-to-Pan',
    orbColor: '#3BFF96',
    action: 'ai-video'
  }
]

const aiToolsList = [
  { title: 'Auto Subtitles', desc: 'Word-level timeline generator', icon: 'mdi-text-box-outline' },
  { title: 'Pan & Scan', desc: 'Drag-to-pan visual camera angles', icon: 'mdi-crop' },
  { title: 'Word Stylist', desc: 'Paint individual subtitle characters', icon: 'mdi-palette-swatch' },
  { title: 'Multi-Ratio Render', desc: '9:16 vertical, 1:1 square, or 4:3 standard outputs', icon: 'mdi-movie-open-outline' }
]

const onQuickCardClick = (_card: any) => {
  router.push('/studio/import')
}

const onBannerAction = (_slide: any) => {
  router.push('/studio/import')
}
</script>
