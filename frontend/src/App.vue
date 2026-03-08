<template>
  <v-app>
    <div class="animated-bg"></div>

    <!-- App Bar -->
    <v-app-bar class="glass-header" elevation="0">
      <v-toolbar-title class="font-weight-bold d-flex align-center">
        <v-icon icon="mdi-video-vintage" class="mr-3 text-primary"></v-icon>
        <span class="gradient-text text-h5 font-weight-black">Clipyzee MVP</span>
        <v-chip class="ml-4 bg-surface text-secondary font-weight-medium border" size="small" variant="flat">
          2-Phase Engine
        </v-chip>
      </v-toolbar-title>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="bg-background relative-content">
      <v-container class="pt-8 pb-12">
        <!-- Configuration Card -->
        <v-card class="mb-8 glass-card rounded-xl pa-2" elevation="10">
          <v-card-text>
            <div class="d-flex align-center mb-6">
              <v-avatar color="primary" variant="tonal" class="mr-4">
                <v-icon icon="mdi-rocket-launch"></v-icon>
              </v-avatar>
              <div>
                <h2 class="text-h5 font-weight-bold text-white mb-1">Phase 1: Analysis & Extraction</h2>
                <div class="text-subtitle-2 text-grey-lighten-1">Enter a YouTube link to begin AI clipping breakdown.</div>
              </div>
            </div>
            
            <v-row class="px-2 pb-2">
              <v-col cols="12" md="9">
                <v-text-field
                  v-model="videoUrl"
                  label="Paste YouTube Link Here"
                  placeholder="https://www.youtube.com/watch?v=..."
                  prepend-inner-icon="mdi-link"
                  variant="solo-filled"
                  bg-color="rgba(0,0,0,0.2)"
                  hide-details
                  rounded="lg"
                  :disabled="isProcessing"
                  class="text-body-1"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3" class="d-flex align-center">
                <v-btn
                  class="gradient-btn text-white font-weight-bold rounded-lg"
                  size="x-large"
                  block
                  :loading="isProcessing"
                  @click="startProcessing"
                  prepend-icon="mdi-brain"
                >
                  Analyze Video
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Results / Dashboard Area -->
        <v-row>
          <!-- Live Logs -->
          <v-col cols="12" md="6">
            <v-card class="h-100 glass-card rounded-xl d-flex flex-column" elevation="10" style="min-height: 500px;">
              <v-card-title class="d-flex align-center py-4 px-6 border-b border-opacity-25">
                <v-icon icon="mdi-console" class="mr-3 text-info" size="small"></v-icon>
                <span class="font-weight-bold text-subtitle-1">Processing Logs</span>
                <v-spacer></v-spacer>
                <v-progress-circular
                  v-if="isProcessing"
                  indeterminate
                  size="24"
                  width="2"
                  color="secondary"
                ></v-progress-circular>
              </v-card-title>
              <v-card-text class="pa-0 flex-grow-1 bg-black opacity-80" style="border-bottom-left-radius: 24px; border-bottom-right-radius: 24px;">
                <v-textarea
                  v-model="logs"
                  readonly
                  no-resize
                  class="font-monospace text-caption h-100"
                  rows="22"
                  variant="solo"
                  bg-color="transparent"
                  hide-details
                ></v-textarea>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- AI Results / Clip Candidates -->
          <v-col cols="12" md="6">
            <v-card class="h-100 glass-card rounded-xl" elevation="10" style="min-height: 500px;">
              <v-card-title class="d-flex align-center py-4 px-6 border-b border-opacity-25">
                <v-icon icon="mdi-timeline-clock" class="mr-3 text-success" size="small"></v-icon>
                <span class="font-weight-bold text-subtitle-1">Phase 2: Clip Candidates</span>
                <v-spacer></v-spacer>
                <v-chip color="success" variant="flat" size="small" class="font-weight-bold px-3" v-if="clips.length > 0">
                  {{ clips.length }} Found
                </v-chip>
              </v-card-title>
              
              <v-card-text class="pa-0" style="max-height: 550px; overflow-y: auto;">
                <v-list v-if="clips.length > 0" lines="three" bg-color="transparent" class="pa-0">
                  <v-list-item v-for="(clip, index) in clips" :key="index" class="hover-item px-6 py-5">
                    <template v-slot:prepend>
                      <v-avatar color="rgba(99, 102, 241, 0.15)" size="48" class="mr-4 text-primary font-weight-black border border-primary border-opacity-50">
                        #{{ index + 1 }}
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-bold text-body-1 mb-1 d-flex align-center">
                      <v-icon icon="mdi-clock-outline" size="small" class="mr-2 text-grey"></v-icon>
                      {{ formatTime(clip.start) }} - {{ formatTime(clip.end) }}
                      <v-chip size="small" :color="clip.score > 80 ? 'success' : 'warning'" variant="tonal" class="ml-4 font-weight-bold">
                        Score: {{ clip.score }}
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
                         Preview
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

                    <v-divider v-if="index !== clips.length - 1" class="mt-5 border-opacity-25"></v-divider>
                  </v-list-item>
                </v-list>
                
                <div v-else class="h-100 d-flex flex-column align-center justify-center pa-8 text-center" style="min-height: 400px;">
                  <v-avatar color="rgba(255,255,255,0.05)" size="90" class="mb-6">
                    <v-icon icon="mdi-movie-search-outline" size="50" color="grey-darken-1"></v-icon>
                  </v-avatar>
                  <div class="text-h6 text-grey-lighten-1 font-weight-medium mb-2">No clips generated yet</div>
                  <div class="text-body-2 text-grey">Submit a video link above to begin the AI analysis engine.</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const API_BASE = 'http://localhost:3000'

interface ClipCandidate {
  start: number;
  end: number;
  reason: string;
  score: number;
  isDownloading?: boolean;
}

const videoUrl = ref('')
const currentVideoId = ref('')
const isProcessing = ref(false)
const logs = ref<string>('System initialized. Awaiting user input...\n')
const clips = ref<ClipCandidate[]>([])

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const appendLog = (message: string) => {
  const timeInfo = new Date().toLocaleTimeString()
  logs.value += `[${timeInfo}] ${message}\n`
}

// -----------------------------------------------------
// Phase 1: Analyze Pipeline
// -----------------------------------------------------
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
    currentVideoId.value = data.video.id
    
    appendLog(`[QUEUED] Job ID: ${data.jobId}. Waiting for worker to pick up...`)
    pollAnalysisJob(data.jobId)
  } catch (err: any) {
    appendLog(`[ERROR] Failed to start analysis: ${err.message}`)
    isProcessing.value = false
  }
}

const pollAnalysisJob = async (jobId: string) => {
  const checkInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/video/job/${jobId}`)
      const data = await res.json()
      
      if (data.status === 'COMPLETED') {
        clearInterval(checkInterval)
        appendLog(`[DONE] Analysis finished successfully!`)
        clips.value = data.result?.clips || []
        isProcessing.value = false
      } else if (data.status === 'FAILED') {
        clearInterval(checkInterval)
        appendLog(`[FAILED] Transcription or analysis crashed on worker node.`)
        isProcessing.value = false
      } else {
        appendLog(`Worker status: [${data.status}]...`)
      }
    } catch (e) {
      console.error(e)
    }
  }, 4000)
}

// -----------------------------------------------------
// Phase 2: Render & Download
// -----------------------------------------------------
const openPreview = (clip: ClipCandidate) => {
  const startSec = Math.floor(clip.start)
  const joiner = videoUrl.value.includes('?') ? '&' : '?'
  window.open(`${videoUrl.value}${joiner}t=${startSec}s`, '_blank')
}

const downloadClip = async (clip: ClipCandidate) => {
   try {
     clip.isDownloading = true
     appendLog(`[RENDER] Dispatching Phase 2 Render Job for limits [${formatTime(clip.start)} - ${formatTime(clip.end)}]`)
     
     const res = await fetch(`${API_BASE}/video/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           videoId: currentVideoId.value,
           url: videoUrl.value,
           start: clip.start,
           end: clip.end
        })
     })
     
     if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
     const data = await res.json()
     
     appendLog(`[QUEUED] Render Job ID: ${data.jobId}. Waiting for worker...`)
     pollRenderJob(data.jobId, clip)
     
   } catch(e: any) {
     appendLog(`[ERROR] Failed to start render: ${e.message}`)
     clip.isDownloading = false
   }
}

const pollRenderJob = async (jobId: string, clip: ClipCandidate) => {
   const checkInterval = setInterval(async () => {
      try {
         const res = await fetch(`${API_BASE}/video/job/${jobId}`)
         const data = await res.json()
         
         if (data.status === 'COMPLETED') {
            clearInterval(checkInterval)
            clip.isDownloading = false
            appendLog(`[RENDER DONE] Fast yt-dlp snippet downloaded! Fetching file...`)
            
            // Trigger browser download by accessing the exposed file pipe endpoint
            window.location.href = `${API_BASE}/video/download?path=${encodeURIComponent(data.result.filePath)}`
            
         } else if (data.status === 'FAILED') {
            clearInterval(checkInterval)
            clip.isDownloading = false
            appendLog(`[RENDER FAILED] Worker failed to extract clip segment via yt-dlp.`)
         } else {
            appendLog(`[RENDER] Status: [${data.status}]...`)
         }
      } catch(e) {
         console.error(e)
      }
   }, 3000)
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');

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
  background: linear-gradient(to right, #6366F1, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-btn {
  background: linear-gradient(45deg, #6366F1, #EC4899) !important;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.gradient-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -6px rgba(99, 102, 241, 0.6);
}

.animated-bg {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 0;
  background: radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.15), transparent 25%),
              radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.15), transparent 25%);
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
</style>
