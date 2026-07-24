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

    <!-- Step 3: Candidates Selection Page (Opus Clip Redesign) -->
    <div v-if="step === 'candidates'">
      <!-- YouTube Video Header Banner -->
      <v-card class="mb-8 overflow-hidden rounded-xl border border-white border-opacity-5" style="background: linear-gradient(100deg, #13131A 0%, #0F0F12 100%);" elevation="4">
        <div class="d-flex flex-column flex-sm-row pa-6 align-center relative-content gap-6">
          <!-- Thumbnail cover -->
          <v-img
            v-if="getYouTubeThumbnail(videoUrl)"
            :src="getYouTubeThumbnail(videoUrl)"
            width="220"
            height="124"
            class="rounded-lg border border-white border-opacity-10 bg-black flex-grow-0"
            cover
          ></v-img>
          <div v-else class="rounded-lg border border-white border-opacity-10 bg-black d-flex align-center justify-center flex-grow-0" style="width: 220px; height: 124px;">
            <v-icon icon="mdi-video-off-outline" color="grey" size="36"></v-icon>
          </div>

          <!-- Video Details metadata -->
          <div class="flex-grow-1 text-center text-sm-left">
            <div class="d-flex align-center justify-center justify-sm-start flex-wrap gap-2 mb-2">
              <v-chip color="primary" variant="flat" size="x-small" class="font-weight-bold text-uppercase tracking-wider">Active Workspace</v-chip>
              <v-chip color="success" variant="tonal" size="x-small" class="font-weight-bold" prepend-icon="mdi-check-circle">AI Analysis Completed</v-chip>
            </div>
            <h1 class="text-h5 font-weight-black text-white mb-2" style="font-family: 'Outfit', sans-serif;">
              {{ getActiveVideoTitle() }}
            </h1>
            <div class="text-caption text-grey d-flex align-center justify-center justify-sm-start flex-wrap gap-x-4 gap-y-1">
              <span class="d-flex align-center"><v-icon icon="mdi-link-variant" size="x-small" class="mr-1"></v-icon> YouTube Source</span>
              <span class="d-flex align-center"><v-icon icon="mdi-video-check" size="x-small" class="mr-1"></v-icon> {{ clips.length }} Highlight Clips Found</span>
            </div>
          </div>

          <!-- Back button -->
          <div class="align-self-center">
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
        </div>
      </v-card>

      <!-- Section Title -->
      <div class="d-flex align-center justify-space-between mb-6">
        <h2 class="text-h5 font-weight-black text-white mb-0" style="font-family: 'Outfit', sans-serif;">
          <v-icon icon="mdi-star" color="warning" class="mr-2"></v-icon> AI Viral Clips Grid
        </h2>
      </div>

      <!-- Candidates Grid list -->
      <v-row v-if="clips.length > 0">
        <v-col cols="12" md="6" v-for="(clip, index) in clips" :key="index">
          <v-card class="glass-card rounded-xl pa-5 d-flex flex-column hover-scale-card relative-content" style="min-height: 290px; border: 1px solid rgba(255, 255, 255, 0.05);" elevation="4">
            
            <!-- Card Header: Metadata & Radial Gauge -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <div class="d-flex align-center gap-2 mb-1">
                  <v-chip color="primary" variant="flat" size="x-small" class="font-weight-black rounded-lg">CLIP #{{ index + 1 }}</v-chip>
                  <v-chip v-if="clip.isEdited" color="info" variant="flat" size="x-small" class="font-weight-black rounded-lg">EDITED</v-chip>
                </div>
                <!-- Catchy viral title -->
                <div class="text-subtitle-1 font-weight-black text-primary text-truncate mt-1" style="max-width: 250px;" v-if="clip.title">
                  {{ clip.title }}
                </div>
                <div class="text-caption font-weight-medium text-white d-flex align-center mt-1">
                  <v-icon icon="mdi-clock-outline" size="x-small" class="mr-1 text-grey-lighten-1"></v-icon>
                  {{ formatTime(clip.start) }} - {{ formatTime(clip.end) }}
                  <span class="text-caption text-grey ml-2">({{ Math.round(clip.end - clip.start) }}s)</span>
                </div>
              </div>

              <!-- Radial Gauge Score Meter -->
              <div class="d-flex align-center gap-3">
                <div class="text-right">
                  <div class="text-caption text-grey font-weight-bold">Virality Score</div>
                  <div class="text-caption font-weight-black" :style="{ color: getScoreColor(clip.score) }">
                    {{ getScoreLabel(clip.score) }}
                  </div>
                </div>
                <div class="position-relative d-flex align-center justify-center" style="width: 55px; height: 55px;">
                  <svg class="score-circle-svg" viewBox="0 0 36 36" style="width: 55px; height: 55px; transform: rotate(-90deg);">
                    <path
                      class="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      stroke-width="3"
                    />
                    <path
                      class="circle"
                      :stroke-dasharray="`${clip.score * 10}, 100`"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      :stroke="getScoreColor(clip.score)"
                      stroke-width="3"
                      stroke-linecap="round"
                    />
                  </svg>
                  <div class="position-absolute font-weight-black text-subtitle-2" :style="{ color: getScoreColor(clip.score) }">
                    {{ clip.score * 10 }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Body: AI Hook and reason description -->
            <div class="bg-black bg-opacity-35 border border-white border-opacity-5 rounded-lg pa-3 mb-4 flex-grow-1">
              <div class="text-caption font-weight-bold text-grey-lighten-1 mb-1 d-flex align-center">
                <v-icon icon="mdi-comment-text-multiple-outline" class="mr-1 text-primary" size="x-small"></v-icon>
                AI Hook Potential & Reasoning
              </div>
              <p class="text-caption text-grey-lighten-2 mb-2" style="line-height: 1.4; white-space: normal;">
                {{ clip.reason }}
              </p>

              <!-- Detailed Score Breakdown Bars -->
              <div v-if="clip.hookScore || clip.flowScore" class="d-flex flex-wrap gap-x-4 gap-y-1 mt-2 border-t border-white border-opacity-5 pt-2">
                <div class="d-flex align-center" style="min-width: 120px;">
                  <span class="text-caption text-grey mr-2" style="font-size: 11px !important;">Hook Potential:</span>
                  <v-progress-linear :model-value="(clip.hookScore || clip.score) * 10" color="amber-accent-4" height="6" rounded style="width: 40px;"></v-progress-linear>
                  <span class="text-caption text-amber-accent-4 font-weight-bold ml-2" style="font-size: 11px !important;">{{ clip.hookScore || clip.score }}/10</span>
                </div>
                <div class="d-flex align-center" style="min-width: 120px;">
                  <span class="text-caption text-grey mr-2" style="font-size: 11px !important;">Audio Flow:</span>
                  <v-progress-linear :model-value="(clip.flowScore || clip.score) * 10" color="cyan" height="6" rounded style="width: 40px;"></v-progress-linear>
                  <span class="text-caption text-cyan font-weight-bold ml-2" style="font-size: 11px !important;">{{ clip.flowScore || clip.score }}/10</span>
                </div>
              </div>

              <!-- Auto Emojis generated keywords -->
              <div v-if="clip.emojiMap && Object.keys(clip.emojiMap).length > 0" class="mt-2 d-flex flex-wrap gap-1 align-center border-t border-white border-opacity-5 pt-2">
                <span class="text-caption text-grey mr-1" style="font-size: 10px !important;">AI Emojis:</span>
                <v-chip 
                  v-for="(emoji, word) in clip.emojiMap" 
                  :key="word" 
                  size="x-small" 
                  variant="tonal" 
                  color="primary" 
                  class="rounded-lg px-2"
                  style="font-size: 10px !important;"
                >
                  <span class="font-weight-bold text-white mr-1">{{ word }}</span> {{ emoji }}
                </v-chip>
              </div>
            </div>

            <!-- Card Footer: Actions Row -->
            <div class="d-flex align-center justify-space-between pt-2 border-t border-white border-opacity-5 mt-auto">
              <div class="d-flex gap-2">
                <v-btn
                  size="small"
                  color="grey"
                  variant="outlined"
                  prepend-icon="mdi-play-circle"
                  @click="openPreview(clip)"
                  class="rounded-lg text-none font-weight-bold"
                >
                  Preview
                </v-btn>
                <v-btn
                  size="small"
                  color="warning"
                  variant="tonal"
                  prepend-icon="mdi-movie-open-edit"
                  @click="openEditor(clip, index)"
                  class="rounded-lg text-none font-weight-bold"
                >
                  Edit
                </v-btn>
              </div>
              <v-btn
                size="small"
                color="success"
                variant="flat"
                prepend-icon="mdi-download"
                :loading="clip.isDownloading"
                @click="downloadClip(clip)"
                class="rounded-lg text-none font-weight-bold px-4 gradient-btn"
              >
                Render HD
              </v-btn>
            </div>

          </v-card>
        </v-col>
      </v-row>
      
      <!-- Empty State -->
      <div v-else class="text-center pa-12 text-grey d-flex flex-column align-center justify-center" style="min-height: 350px;">
        <v-avatar color="rgba(255,255,255,0.03)" size="80" class="mb-4">
          <v-icon icon="mdi-movie-search-outline" size="40" color="grey-darken-2"></v-icon>
        </v-avatar>
        <div class="text-h6 text-grey-lighten-1">No Clip candidates loaded yet</div>
      </div>
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

// Youtube Thumbnail extract regex
const getYouTubeThumbnail = (url: string) => {
  if (!url) return ''
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?\s*v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  const videoId = (match && match[2] && match[2].length === 11) ? match[2] : null
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : ''
}

const getActiveVideoTitle = (): string => {
  const activeVideo = history.value.find(v => v.id === id)
  if (activeVideo && activeVideo.title && activeVideo.title !== 'Pending Title Fetch') {
    return activeVideo.title
  }
  return videoUrl.value || 'AI Workspace Processing'
}

const getScoreColor = (score: number) => {
  const pct = score * 10
  if (pct >= 85) return '#10B981' // Emerald
  if (pct >= 70) return '#F59E0B' // Amber/Orange
  return '#EC4899' // Pink/Red
}

const getScoreLabel = (score: number) => {
  const pct = score * 10
  if (pct >= 85) return 'Very High Hook'
  if (pct >= 70) return 'High Potential'
  return 'Moderate'
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.score-circle-svg {
  animation: score-rotate 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@keyframes score-rotate {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
