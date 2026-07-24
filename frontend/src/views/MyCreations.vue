<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h2 class="text-h4 font-weight-bold text-white mb-1" style="font-family: 'Outfit', sans-serif;">My Creations</h2>
        <p class="text-body-1 text-grey">Load history records, download rendered files, or continue editing your candidate outputs.</p>
      </div>
      <v-btn icon="mdi-refresh" variant="outlined" color="grey" class="rounded-lg" :loading="isFetchingHistory" @click="fetchHistory"></v-btn>
    </div>

    <v-row v-if="history.length > 0">
      <v-col cols="12" md="6" lg="4" v-for="item in history" :key="item.id">
        <v-card class="glass-card rounded-xl pa-4 d-flex flex-column relative-content" style="min-height: 200px;" elevation="4">
          <div class="text-caption text-primary font-weight-bold mb-1 text-uppercase tracking-wider">Analysis Run</div>
          <h3 class="text-h6 font-weight-bold text-white mb-1 text-truncate" style="line-height: 1.3;">
            {{ item.title && item.title !== 'Pending Title Fetch' ? item.title : item.sourceUrl }}
          </h3>
          <div class="text-caption text-grey mb-4">Processed on: {{ formatDate(item.createdAt) }}</div>
          
          <v-spacer></v-spacer>
          
          <div class="d-flex align-center justify-space-between border-t border-white border-opacity-5 pt-3">
            <span class="text-caption text-grey font-weight-bold">
              <v-icon icon="mdi-video-outline" size="small" class="mr-1"></v-icon>
              {{ getClipsCount(item) }} Clip Candidates
            </span>
            
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              class="rounded-lg font-weight-bold text-none px-4 gradient-btn"
              @click="handleLoadHistory(item)"
            >
              Open Studio
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <div v-else class="text-center py-12 text-grey">
      <v-icon icon="mdi-folder-open-outline" size="64" class="mb-4 text-grey-darken-1"></v-icon>
      <div class="text-h6 text-grey-lighten-1">No creations found yet</div>
      <div class="text-body-2">Analyze a YouTube video in the Explore tab to get started.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspace } from '../composables/useWorkspace'

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
