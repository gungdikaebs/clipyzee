<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-heading text-2xl font-bold text-text-primary mb-1">My Creations</h1>
        <p class="text-sm text-text-secondary">Load history records, download rendered files, or continue editing your candidate outputs.</p>
      </div>
      <button class="btn-secondary p-2.5 rounded-lg" :disabled="isFetchingHistory" @click="fetchHistory">
        <RefreshCw :size="16" :class="{ 'animate-spin': isFetchingHistory }" />
      </button>
    </div>

    <!-- Cards Grid -->
    <div v-if="history.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="item in history"
        :key="item.id"
        class="glass-card p-5 flex flex-col min-h-[190px]"
      >
        <span class="chip chip-primary mb-2 self-start">Analysis Run</span>
        <h3 class="text-sm font-bold text-text-primary mb-1 truncate leading-snug">
          {{ item.title && item.title !== 'Pending Title Fetch' ? item.title : item.sourceUrl }}
        </h3>
        <p class="text-xs text-text-muted mb-auto">Processed on: {{ formatDate(item.createdAt) }}</p>

        <div class="flex items-center justify-between pt-3 mt-3 border-t border-border">
          <span class="text-xs text-text-secondary font-semibold flex items-center gap-1.5">
            <Film :size="13" />
            {{ getClipsCount(item) }} Clip Candidates
          </span>
          <button class="btn-primary text-xs py-1.5 px-4" @click="handleLoadHistory(item)">
            Open Studio
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16">
      <FolderOpen :size="48" class="text-text-muted mx-auto mb-4" />
      <p class="text-base text-text-secondary font-medium">No creations found yet</p>
      <p class="text-sm text-text-muted mt-1">Analyze a YouTube video in the Explore tab to get started.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspace } from '../composables/useWorkspace'
import { RefreshCw, Film, FolderOpen } from 'lucide-vue-next'

const router = useRouter()
const { history, isFetchingHistory, fetchHistory, loadHistoryItem } = useWorkspace()

onMounted(() => {
  fetchHistory()
})

const handleLoadHistory = (item: any) => {
  const success = loadHistoryItem(item)
  if (success) {
    router.push(`/studio/candidates/${item.id}`)
  }
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getClipsCount = (item: any): number => {
  const analyzeJob = item.jobs?.find((j: any) => j.type === 'ANALYZE' && j.status === 'COMPLETED')
  return analyzeJob?.result?.clips?.length || 0
}
</script>
