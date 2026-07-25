<template>
  <div class="min-h-screen bg-bg text-text-primary">
    <div class="animated-bg"></div>

    <!-- Sidebar -->
    <aside
      v-if="!isEditorRoute"
      class="fixed top-0 left-0 h-screen w-60 bg-surface border-r border-border z-30 flex flex-col"
    >
      <!-- Brand -->
      <div class="px-5 py-5 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg btn-primary flex items-center justify-center flex-shrink-0">
          <Film :size="16" class="text-white" />
        </div>
        <span class="font-heading text-lg font-black gradient-text tracking-wide">Clipyzee AI</span>
      </div>

      <!-- Nav Groups -->
      <nav class="flex-1 px-3 mt-2">
        <p class="px-3 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Tools</p>
        <button
          v-for="item in sidebarMenu"
          :key="item.value"
          @click="navigateSidebar(item.value)"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5',
            isActive(item.value)
              ? 'bg-accent/10 text-accent border-l-[3px] border-accent pl-[9px]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
          ]"
        >
          <component :is="item.icon" :size="18" />
          {{ item.title }}
        </button>

        <p class="px-3 mb-2 mt-6 text-[10px] font-bold text-text-muted uppercase tracking-widest">Archive</p>
        <button
          @click="navigateSidebar('my-creations')"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            route.path === '/my-creations'
              ? 'bg-accent/10 text-accent border-l-[3px] border-accent pl-[9px]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
          ]"
        >
          <FolderOpen :size="18" />
          My Creations
        </button>
      </nav>
    </aside>

    <!-- Top Header -->
    <header
      v-if="!isEditorRoute"
      class="fixed top-0 left-60 right-0 h-14 bg-surface/80 backdrop-blur-xl border-b border-border z-20 flex items-center justify-between px-6"
    >
      <div class="flex items-center gap-1">
        <button
          v-for="tab in headerTabs"
          :key="tab.value"
          @click="onHeaderTab(tab.value)"
          :class="[
            'px-4 py-1.5 text-sm font-medium border-b-2 transition-colors',
            activeHeaderTab === tab.value
              ? 'border-accent text-white'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="flex items-center gap-3">
        <button class="btn-secondary text-xs flex items-center gap-1.5" @click="showFeatureModal('Feedback Portal')">
          <MessageCircle :size="14" />
          Feedback
        </button>
        <div class="chip chip-primary">
          <Zap :size="12" />
          100 Credits
        </div>
        <div class="w-8 h-8 rounded-full btn-primary flex items-center justify-center text-xs font-black cursor-pointer">J</div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      :class="isEditorRoute ? 'relative z-10' : 'ml-60 pt-14 relative z-10'"
    >
      <div :class="isEditorRoute ? '' : 'px-8 py-6'">
        <router-view />
      </div>
    </main>

    <!-- Extraction Overlay -->
    <Teleport to="body">
      <div v-if="isExtractingVideo" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <div class="glass-card p-8 text-center max-w-xs">
          <div class="spinner mx-auto mb-5"></div>
          <p class="text-sm font-semibold mb-1">Preparing Raw Clip</p>
          <p class="text-xs text-text-secondary">{{ extractionProgress }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Feature Coming Soon Modal -->
    <Teleport to="body">
      <div v-if="featureModal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center" @click.self="featureModal = false">
        <div class="glass-card p-8 text-center max-w-sm w-full mx-4">
          <div class="w-16 h-16 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center mx-auto mb-4">
            <Wrench :size="28" class="text-accent" />
          </div>
          <h3 class="font-heading text-xl font-black mb-2">{{ activeFeatureName }}</h3>
          <p class="text-sm text-text-secondary mb-6">This feature is currently in active development on the Clipyzee engine. Stay tuned for updates!</p>
          <button class="btn-primary w-full" @click="featureModal = false">Awesome</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from './composables/useWorkspace'
import { Film, Compass, Clapperboard, FolderOpen, Zap, MessageCircle, Wrench } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEditorRoute = computed(() => route.path.startsWith('/studio/editor/'))

const { isExtractingVideo, extractionProgress } = useWorkspace()

const activeHeaderTab = ref('create')
const featureModal = ref(false)
const activeFeatureName = ref('')

const showFeatureModal = (name: string) => {
  activeFeatureName.value = name
  featureModal.value = true
}

const sidebarMenu = [
  { title: 'Explore Dashboard', value: 'explore', icon: Compass },
  { title: 'AI Clipping Studio', value: 'ai-video', icon: Clapperboard }
]

const headerTabs = [
  { label: 'Create', value: 'create' },
  { label: 'Publish', value: 'publish' }
]

const onHeaderTab = (tab: string) => {
  activeHeaderTab.value = tab
  if (tab === 'publish') showFeatureModal('Publishing Manager')
}

const isActive = (value: string) => {
  if (value === 'explore') return route.path === '/explore'
  return route.path.startsWith('/studio')
}

const navigateSidebar = (tab: string) => {
  if (tab === 'explore') router.push('/explore')
  else if (tab === 'ai-video') router.push('/studio/import')
  else if (tab === 'my-creations') router.push('/my-creations')
}
</script>
