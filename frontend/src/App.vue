<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar color="primary" elevation="2">
      <v-toolbar-title class="font-weight-bold">
        <v-icon icon="mdi-video-vintage" class="mr-2"></v-icon>
        Clipyzee MVP: 2-Phase Engine
      </v-toolbar-title>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="bg-background">
      <v-container>
        <!-- Configuration Card -->
        <v-card class="mb-6 elevation-2 rounded-lg pa-4">
          <v-card-text>
            <div class="text-h6 mb-4">Phase 1: Analysis & Extraction</div>
            <v-row>
              <v-col cols="12" md="9">
                <v-text-field
                  v-model="videoUrl"
                  label="Paste YouTube Link Here"
                  prepend-inner-icon="mdi-link"
                  variant="outlined"
                  hide-details
                  :disabled="isProcessing"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3" class="d-flex align-center">
                <v-btn
                  color="success"
                  size="large"
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
            <v-card class="h-100 elevation-2 rounded-lg" style="min-height: 400px;">
              <v-card-title class="bg-grey-darken-4 d-flex align-center">
                <v-icon icon="mdi-console" class="mr-2" size="small"></v-icon>
                Processing Logs
                <v-spacer></v-spacer>
                <v-progress-circular
                  v-if="isProcessing"
                  indeterminate
                  size="20"
                  width="2"
                  color="warning"
                ></v-progress-circular>
              </v-card-title>
              <v-card-text class="bg-black pa-0">
                <v-textarea
                  v-model="logs"
                  readonly
                  no-resize
                  class="font-monospace text-caption"
                  rows="20"
                  variant="solo"
                  bg-color="black"
                  hide-details
                ></v-textarea>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- AI Results / Clip Candidates -->
          <v-col cols="12" md="6">
            <v-card class="h-100 elevation-2 rounded-lg" style="min-height: 400px;">
              <v-card-title class="bg-grey-darken-3 d-flex align-center">
                <v-icon icon="mdi-timeline-clock" class="mr-2" size="small"></v-icon>
                Phase 2: Clip Candidates
                <v-chip class="ml-4" color="info" size="small" v-if="clips.length > 0">
                  {{ clips.length }} Found
                </v-chip>
              </v-card-title>
              
              <v-card-text class="pa-0" style="max-height: 500px; overflow-y: auto;">
                <v-list v-if="clips.length > 0" lines="three">
                  <v-list-item v-for="(clip, index) in clips" :key="index">
                    <template v-slot:prepend>
                      <v-avatar color="primary" class="text-white font-weight-bold">
                        #{{ index + 1 }}
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-bold pt-1">
                      {{ formatTime(clip.start) }} - {{ formatTime(clip.end) }}
                      <v-chip size="x-small" color="orange" class="ml-2">Score: {{ clip.score }}</v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle class="mt-1 pb-1">
                      <span class="text-white">{{ clip.reason }}</span>
                    </v-list-item-subtitle>
                    
                    <div class="mt-3 mb-2 d-flex">
                       <v-btn 
                         size="small" 
                         color="blue-lighten-1" 
                         variant="tonal" 
                         prepend-icon="mdi-youtube" 
                         @click="openPreview(clip)"
                         class="mr-3"
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
                       >
                         Download Render
                       </v-btn>
                    </div>

                    <v-divider v-if="index !== clips.length - 1" class="mt-2"></v-divider>
                  </v-list-item>
                </v-list>
                <div v-else class="pa-8 text-center text-grey">
                  <v-icon icon="mdi-sleep" size="x-large" class="mb-2"></v-icon>
                  <div>No clips processed yet.</div>
                  <div class="text-caption mt-1">Submit a video link to begin AI analysis.</div>
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
.font-monospace {
  font-family: monospace;
}
</style>
