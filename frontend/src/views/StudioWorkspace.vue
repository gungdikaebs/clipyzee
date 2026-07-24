<template>
  <div>
    <!-- Step 1: Video Import Form -->
    <div v-if="step === 'import'" class="d-flex justify-center align-center py-8">
      <v-card class="glass-card rounded-xl pa-8 w-100 border border-white border-opacity-10" style="max-width: 750px;" elevation="12">
        <div class="text-center mb-8">
          <v-avatar color="rgba(255, 107, 74, 0.1)" size="80" class="mb-4 border border-primary border-opacity-25">
            <v-icon icon="mdi-youtube" color="primary" size="40"></v-icon>
          </v-avatar>
          <h2 class="text-h4 font-weight-black text-white mb-2" style="font-family: 'Outfit', sans-serif;">AI Video Clipping Engine</h2>
          <p class="text-body-1 text-grey" style="max-width: 500px; margin: 0 auto;">Paste any landscape YouTube video link. We will isolate the highlights, transcribe, and render vertical shorts.</p>
        </div>
        
        <v-row class="px-2">
          <v-col cols="12" class="pb-1">
            <v-text-field
              v-model="videoUrl"
              label="Paste YouTube URL"
              placeholder="https://www.youtube.com/watch?v=..."
              prepend-inner-icon="mdi-link"
              variant="solo-filled"
              bg-color="rgba(0,0,0,0.3)"
              rounded="lg"
              :disabled="isProcessing"
              class="text-body-1 mb-2"
            ></v-text-field>
          </v-col>
          <v-col cols="12" class="pt-0">
            <v-btn
              class="gradient-btn text-white font-weight-bold rounded-lg py-4"
              size="x-large"
              block
              :loading="isProcessing"
              @click="startProcessing"
              prepend-icon="mdi-brain"
            >
              Extract & Analyze Video
            </v-btn>
          </v-col>
        </v-row>
      </v-card>
    </div>

    <!-- Step 2: Live Log Analysis Panel -->
    <div v-if="step === 'analyze'" class="d-flex justify-center align-center py-4">
      <v-card class="glass-card rounded-xl pa-6 w-100" style="max-width: 850px;" elevation="10">
        <div class="d-flex align-center mb-6">
          <v-progress-circular
            indeterminate
            size="48"
            width="4"
            color="primary"
            class="mr-4"
          ></v-progress-circular>
          <div>
            <h2 class="text-h5 font-weight-black text-white mb-1" style="font-family: 'Outfit', sans-serif;">Clipyzee Engine Processing</h2>
            <p class="text-body-2 text-grey">Extracting transcript and generating candidates via AI...</p>
          </div>
        </div>

        <div class="bg-black bg-opacity-80 rounded-lg overflow-hidden border border-white border-opacity-5">
          <v-textarea
            v-model="logs"
            readonly
            no-resize
            class="font-monospace text-caption h-100"
            rows="16"
            variant="solo"
            bg-color="transparent"
            hide-details
          ></v-textarea>
        </div>
      </v-card>
    </div>

    <!-- Step 3: Candidates Selection Page -->
    <div v-if="step === 'candidates'">
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h2 class="text-h4 font-weight-bold text-white mb-1" style="font-family: 'Outfit', sans-serif;">Generated Clip Candidates</h2>
          <p class="text-body-1 text-grey">Open editor to customize individual subtitle segments and frame cropping, or download directly.</p>
        </div>
        <v-btn
          variant="outlined"
          color="grey"
          prepend-icon="mdi-arrow-left"
          class="rounded-lg text-none"
          @click="router.push('/explore')"
        >
          Import New Video
        </v-btn>
      </div>

      <v-card class="glass-card rounded-xl d-flex flex-column" elevation="10">
        <v-card-title class="d-flex align-center py-4 px-6 border-b border-opacity-25 bg-black bg-opacity-20">
          <v-icon icon="mdi-timeline-clock" class="mr-3 text-success" size="small"></v-icon>
          <span class="font-weight-bold text-subtitle-1">Candidates & Subtitle Styling</span>
          <v-spacer></v-spacer>
          <v-chip color="success" variant="flat" size="small" class="font-weight-bold px-3" v-if="clips.length > 0">
            {{ clips.length }} Found
          </v-chip>
        </v-card-title>
        
        <v-card-text class="pa-0">
          <v-list v-if="clips.length > 0" lines="three" bg-color="transparent" class="pa-0">
            <v-list-item v-for="(clip, index) in clips" :key="index" class="hover-item px-6 py-4">
              <template v-slot:prepend>
                <v-avatar color="rgba(255, 107, 74, 0.12)" size="40" class="mr-4 text-primary font-weight-black border border-primary border-opacity-40">
                  #{{ index + 1 }}
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold text-body-1 mb-1 d-flex align-center">
                <v-icon icon="mdi-clock-outline" size="small" class="mr-2 text-grey"></v-icon>
                {{ formatTime(clip.start) }} - {{ formatTime(clip.end) }}
                <v-chip size="small" :color="clip.score >= 7 ? 'success' : 'warning'" variant="tonal" class="ml-4 font-weight-bold">
                  Score: {{ clip.score }}
                </v-chip>
                <v-chip size="small" color="info" variant="flat" class="ml-2 font-weight-bold" v-if="clip.isEdited">
                  Edited
                </v-chip>
              </v-list-item-title>
              <v-list-item-subtitle class="mt-2 text-grey-lighten-2 text-body-2" style="white-space: normal; line-height: 1.5; opacity: 1;">
                {{ clip.reason }}
              </v-list-item-subtitle>
              
              <div class="mt-4 mb-1 d-flex">
                <v-btn 
                  size="small" 
                  color="white" 
                  variant="outlined" 
                  prepend-icon="mdi-play-circle" 
                  @click="openPreview(clip)"
                  class="mr-3 rounded-lg text-none"
                >
                  Preview Original
                </v-btn>
                <v-btn 
                  size="small" 
                  color="warning" 
                  variant="tonal" 
                  prepend-icon="mdi-movie-open-edit" 
                  @click="openEditor(clip, index)"
                  class="mr-3 rounded-lg text-none"
                >
                  Open Editor
                </v-btn>
                <v-btn 
                  size="small" 
                  color="success" 
                  variant="flat" 
                  prepend-icon="mdi-download" 
                  :loading="clip.isDownloading" 
                  @click="downloadClip(clip)"
                  class="rounded-lg text-none font-weight-bold px-4"
                >
                  Render & Download
                </v-btn>
              </div>

              <v-divider v-if="index !== clips.length - 1" class="mt-4 border-opacity-25"></v-divider>
            </v-list-item>
          </v-list>
          
          <div v-else class="text-center pa-12 text-grey d-flex flex-column align-center justify-center" style="min-height: 350px;">
            <v-avatar color="rgba(255,255,255,0.03)" size="80" class="mb-4">
              <v-icon icon="mdi-movie-search-outline" size="40" color="grey-darken-2"></v-icon>
            </v-avatar>
            <div class="text-h6 text-grey-lighten-1">No Clip candidates loaded yet</div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspace } from '../composables/useWorkspace'
import type { ClipCandidate } from '../types'

const router = useRouter()

const { step, id } = defineProps<{
  step: string;
  id?: string;
}>()

const {
  videoUrl,
  isProcessing,
  logs,
  clips,
  history,
  fetchHistory,
  loadHistoryItem,
  pollAnalysisJob,
  openPreview,
  downloadClip,
  editorSegments,
  fullTranscript,
  currentEditingClipIndex,
  isExtractingVideo,
  extractionProgress,
  API_BASE,
  appendLog,
  pollExtractJob
} = useWorkspace()

onMounted(async () => {
  if (step === 'candidates' && id) {
    if (clips.value.length === 0) {
      await fetchHistory()
      const target = history.value.find(v => v.id === id)
      const loaded = loadHistoryItem(target)
      if (!loaded) {
        router.push('/studio/import')
      }
    }
  } else if (step === 'analyze' && id) {
    isProcessing.value = true
    pollAnalysisJob(id, () => {
      fetchHistory().then(() => {
        const item = history.value.find(v => v.jobs?.some((j: any) => j.id === id))
        if (item) {
          loadHistoryItem(item)
          router.push(`/studio/candidates/${item.id}`)
        } else {
          router.push('/studio/import')
        }
      })
    }, () => {
      router.push('/studio/import')
    })
  }
})

const startProcessing = async () => {
  if (!videoUrl.value) {
    appendLog('[ERROR] Video URL is required.')
    return
  }
  
  isProcessing.value = true
  clips.value = []
  appendLog(`[INIT] Dispatching Phase 1 Analysis Job to backend...`)
  
  try {
    const res = await fetch(`${API_BASE}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: videoUrl.value, language: 'id' })
    })
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const data = await res.json()
    
    appendLog(`[QUEUED] Job ID: ${data.jobId}. Waiting for worker to pick up...`)
    router.push(`/studio/analyze/${data.jobId}`)
  } catch (err: any) {
    appendLog(`[ERROR] Failed to start analysis: ${err.message}`)
    isProcessing.value = false
  }
}

const openEditor = async (clip: ClipCandidate, index: number) => {
  currentEditingClipIndex.value = index
  
  if (!clip.rawVideoPath) {
    isExtractingVideo.value = true
    extractionProgress.value = 'Queuing raw clip extraction...'
    try {
      const res = await fetch(`${API_BASE}/video/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: id,
          url: videoUrl.value,
          start: clip.start,
          end: clip.end,
          extractOnly: true
        })
      })
      if (!res.ok) throw new Error(`Server returned status: ${res.status}`)
      const data = await res.json()
      
      extractionProgress.value = 'Downloading clip from YouTube...'
      const rawPath = await pollExtractJob(data.jobId)
      clip.rawVideoPath = rawPath
    } catch (err: any) {
      appendLog(`[ERROR] Raw clip extraction failed: ${err.message}`)
      isExtractingVideo.value = false
      return
    } finally {
      isExtractingVideo.value = false
    }
  }

  let segments = []
  if (clip.customTranscript) {
    segments = JSON.parse(JSON.stringify(clip.customTranscript))
  } else {
    const rawSegments = fullTranscript.value.filter(seg => seg.end > clip.start && seg.start < clip.end)
    segments = JSON.parse(JSON.stringify(rawSegments))
  }
  
  editorSegments.value = segments.map((seg: any) => {
    if (seg.cropX === undefined) {
      seg.cropX = 50
    }
    if (!seg.words || seg.words.length === 0) {
      const wordsList = seg.text.trim().split(/\s+/).filter((w: string) => w.length > 0)
      const duration = seg.end - seg.start
      const wordDuration = duration / Math.max(1, wordsList.length)
      seg.words = wordsList.map((word: string, idx: number) => ({
        text: word,
        start: seg.start + idx * wordDuration,
        end: seg.start + (idx + 1) * wordDuration,
        textColor: '',
        outlineColor: ''
      }))
    }
    return seg
  })
  
  router.push(`/studio/editor/${id}/${index}`)
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
</script>
