<template>
  <div>
    <!-- Page Heading -->
    <h1 class="font-heading text-2xl font-bold text-text-primary mb-1">What would you like to create today?</h1>
    <p class="text-sm text-text-secondary mb-8">Choose a pipeline template or tools workflow to begin your AI generation.</p>

    <!-- Quick Action Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
      <button
        v-for="card in quickCards"
        :key="card.title"
        @click="onQuickCardClick(card)"
        class="relative overflow-hidden rounded-xl p-5 text-white text-left h-[130px] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(255,107,74,0.2)] cursor-pointer group"
        :style="{ background: card.gradient }"
      >
        <component :is="card.icon" :size="24" class="opacity-80" />
        <div>
          <div class="font-heading text-base font-black uppercase tracking-wider leading-tight">{{ card.title }}</div>
          <div class="text-xs opacity-70 mt-0.5">Start workspace</div>
        </div>
      </button>
    </div>

    <!-- Hero Banner -->
    <div class="glass-card overflow-hidden mb-10 h-[230px] relative">
      <div class="flex h-full p-8 items-center justify-between">
        <!-- Text -->
        <div class="max-w-[60%] relative z-10">
          <span class="chip chip-primary mb-3">{{ activeBanner.subtitle }}</span>
          <h2 class="font-heading text-2xl font-black text-text-primary mb-2 leading-tight">{{ activeBanner.title }}</h2>
          <p class="text-sm text-text-secondary mb-5 max-w-md">{{ activeBanner.desc }}</p>
          <button class="btn-primary text-sm" @click="onBannerAction">{{ activeBanner.btnText }}</button>
        </div>
        <!-- Icon -->
        <div class="w-28 h-28 rounded-full border border-border flex items-center justify-center mr-6 relative z-10">
          <Sparkles :size="36" class="text-accent" />
        </div>
        <!-- Glow -->
        <div class="absolute -right-[5%] -top-[20%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-15" :style="{ background: activeBanner.orbColor }"></div>
      </div>
      <!-- Dots navigation -->
      <div class="absolute bottom-4 left-8 flex gap-1.5 z-10">
        <button
          v-for="(_, i) in bannerSlides"
          :key="i"
          @click="bannerIndex = i"
          :class="['w-2 h-2 rounded-full transition-all duration-200', bannerIndex === i ? 'bg-accent w-5' : 'bg-white/20']"
        />
      </div>
    </div>

    <!-- Core Features Grid -->
    <div class="flex items-center gap-2 mb-5 mt-8">
      <Sparkles :size="16" class="text-accent" />
      <h3 class="font-heading text-base font-black text-text-primary">Core Features</h3>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        v-for="t in aiToolsList"
        :key="t.title"
        class="glass-card p-5 text-center flex flex-col items-center justify-center h-[160px] transition-all duration-200 hover:bg-white/[0.03] hover:-translate-y-0.5 cursor-pointer"
        @click="$emit('show-feature', t.title)"
      >
        <div class="w-11 h-11 rounded-lg border border-border bg-white/[0.02] flex items-center justify-center mb-3">
          <component :is="t.icon" :size="18" class="text-accent" />
        </div>
        <div class="text-xs font-bold text-text-primary mb-1">{{ t.title }}</div>
        <div class="text-[11px] text-text-secondary leading-snug">{{ t.desc }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Clapperboard, Type, Sparkles, Subtitles, Move, Palette, Film } from 'lucide-vue-next'

defineEmits<{
  (e: 'show-feature', featureName: string): void;
}>()

const router = useRouter()
const bannerIndex = ref(0)

const quickCards = [
  { title: 'AI Clipping Studio', icon: Clapperboard, gradient: 'linear-gradient(135deg, #FF6B4A 0%, #FF3B96 100%)', tab: 'ai-video' },
  { title: 'Subtitle Stylist', icon: Type, gradient: 'linear-gradient(135deg, #FF963B 0%, #FF3B3B 100%)', tab: 'ai-video' }
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

const activeBanner = computed(() => bannerSlides[bannerIndex.value])

const aiToolsList = [
  { title: 'Auto Subtitles', desc: 'Word-level timeline generator', icon: Subtitles },
  { title: 'Pan & Scan', desc: 'Drag-to-pan visual camera angles', icon: Move },
  { title: 'Word Stylist', desc: 'Paint individual subtitle characters', icon: Palette },
  { title: 'Multi-Ratio Render', desc: '9:16 vertical, 1:1 square, or 4:3', icon: Film }
]

const onQuickCardClick = (_card: any) => {
  router.push('/studio/import')
}

const onBannerAction = () => {
  router.push('/studio/import')
}
</script>
