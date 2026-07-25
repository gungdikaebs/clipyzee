<template>
  <div>
    <!-- Step 1: Video Import Form -->
    <div v-if="step === 'import'" class="flex justify-center items-center py-10">
      <div class="glass-card p-8 w-full max-w-[700px]">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Youtube :size="32" class="text-accent" />
          </div>
          <h1 class="font-heading text-2xl font-black text-text-primary mb-2">AI Video Clipping Engine</h1>
          <p class="text-sm text-text-secondary max-w-md mx-auto">Paste any landscape YouTube video link. We will isolate the highlights, transcribe, and render vertical shorts.</p>
        </div>

        <div class="space-y-3 px-2">
          <div class="relative">
            <Link2 :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              v-model="videoUrl"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              :disabled="isProcessing"
              class="input-dark pl-11"
            />
          </div>
          <button
            class="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
            :disabled="isProcessing"
            @click="startProcessing"
          >
            <span v-if="isProcessing" class="spinner !w-4 !h-4 !border-2"></span>
            <Brain v-else :size="18" />
            Extract & Analyze Video
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2: Live Log Analysis Panel -->
    <div v-if="step === 'analyze'" class="flex justify-center items-center py-6">
      <div class="glass-card p-6 w-full max-w-[800px]">
        <div class="flex items-center gap-4 mb-6">
          <div class="spinner flex-shrink-0"></div>
          <div>
            <h2 class="font-heading text-lg font-black text-text-primary mb-0.5">Clipyzee Engine Processing</h2>
            <p class="text-xs text-text-secondary">Extracting transcript and generating candidates via AI...</p>
          </div>
        </div>

        <div class="bg-black/50 rounded-lg border border-border overflow-hidden">
          <textarea
            :value="logs"
            readonly
            class="w-full h-[360px] bg-transparent text-xs text-text-secondary font-mono p-4 resize-none outline-none"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Step 3: Candidates Selection -->
    <div v-if="step === 'candidates'">
      <!-- Video Header Banner -->
      <div class="glass-card overflow-hidden mb-8">
        <div class="flex flex-col sm:flex-row p-6 items-center gap-6">
          <!-- Thumbnail -->
          <img
            v-if="getYouTubeThumbnail(videoUrl)"
            :src="getYouTubeThumbnail(videoUrl)"
            class="w-[200px] h-[112px] rounded-lg object-cover border border-border flex-shrink-0"
          />
          <div v-else class="w-[200px] h-[112px] rounded-lg border border-border bg-black flex items-center justify-center flex-shrink-0">
            <VideoOff :size="28" class="text-text-muted" />
          </div>

          <!-- Video Details -->
          <div class="flex-1 text-center sm:text-left">
            <div class="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
              <span class="chip chip-primary">Active Workspace</span>
              <span class="chip chip-success flex items-center gap-1">
                <CheckCircle :size="10" />
                AI Analysis Completed
              </span>
            </div>
            <h2 class="font-heading text-lg font-black text-text-primary mb-2">{{ getActiveVideoTitle() }}</h2>
            <div class="flex items-center justify-center sm:justify-start gap-4 text-xs text-text-secondary flex-wrap">
              <span class="flex items-center gap-1"><Link2 :size="12" /> YouTube Source</span>
              <span class="flex items-center gap-1"><Film :size="12" /> {{ clips.length }} Highlight Clips Found</span>
            </div>
          </div>

          <!-- Back button -->
          <button class="btn-secondary text-xs flex items-center gap-1.5 flex-shrink-0" @click="router.push('/explore')">
            <ArrowLeft :size="14" />
            Import New Video
          </button>
        </div>
      </div>

      <!-- Section Title -->
      <div class="flex items-center gap-2 mb-6">
        <Star :size="18" class="text-yellow-400" />
        <h2 class="font-heading text-lg font-black text-text-primary">AI Viral Clips Grid</h2>
      </div>

      <!-- Candidates Grid -->
      <div v-if="clips.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          v-for="(clip, index) in clips"
          :key="index"
          class="glass-card p-5 flex flex-col min-h-[280px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <!-- Card Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 mb-1.5">
                <span class="chip chip-primary">CLIP #{{ index + 1 }}</span>
                <span v-if="clip.isEdited" class="chip chip-info">EDITED</span>
              </div>
              <div class="text-sm font-black text-accent truncate max-w-[250px]">
                {{ clip.title || 'Momen Viral #' + (index + 1) }}
              </div>
              <div class="flex items-center gap-1 text-xs text-text-secondary mt-1">
                <Clock :size="11" />
                {{ formatTime(clip.start) }} - {{ formatTime(clip.end) }}
                <span class="text-text-muted ml-1">({{ Math.round(clip.end - clip.start) }}s)</span>
              </div>
            </div>

            <!-- Radial Gauge -->
            <div class="flex items-center gap-2.5 flex-shrink-0">
              <div class="text-right">
                <div class="text-[10px] text-text-muted font-bold">Virality Score</div>
                <div class="text-[10px] font-black" :style="{ color: getScoreColor(clip.score) }">{{ getScoreLabel(clip.score) }}</div>
              </div>
              <div class="relative flex items-center justify-center" style="width: 48px; height: 48px;">
                <svg viewBox="0 0 36 36" style="width: 48px; height: 48px; transform: rotate(-90deg);">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"
                  />
                  <path
                    class="score-circle"
                    :stroke-dasharray="`${clip.score * 10}, 100`"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" :stroke="getScoreColor(clip.score)" stroke-width="3" stroke-linecap="round"
                  />
                </svg>
                <div class="absolute text-xs font-black" :style="{ color: getScoreColor(clip.score) }">{{ clip.score * 10 }}</div>
              </div>
            </div>
          </div>

          <!-- Card Body: Reason -->
          <div class="bg-black/30 border border-border rounded-lg p-3 mb-4 flex-1">
            <div class="text-[10px] font-bold text-text-secondary mb-1 flex items-center gap-1">
              <MessageSquare :size="10" class="text-accent" />
              AI Hook Potential & Reasoning
            </div>
            <p class="text-xs text-text-secondary leading-relaxed mb-2">{{ clip.reason }}</p>

            <!-- Score Breakdown -->
            <div class="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-border">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-text-muted">Hook:</span>
                <div class="w-10 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full bg-amber-400" :style="{ width: `${(clip.hookScore !== undefined ? clip.hookScore : clip.score) * 10}%` }"></div>
                </div>
                <span class="text-[10px] font-bold text-amber-400">{{ clip.hookScore !== undefined ? clip.hookScore : clip.score }}/10</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-text-muted">Flow:</span>
                <div class="w-10 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full bg-cyan-400" :style="{ width: `${(clip.flowScore !== undefined ? clip.flowScore : Math.max(1, clip.score - 1)) * 10}%` }"></div>
                </div>
                <span class="text-[10px] font-bold text-cyan-400">{{ clip.flowScore !== undefined ? clip.flowScore : Math.max(1, clip.score - 1) }}/10</span>
              </div>
            </div>

            <!-- Emoji tags -->
            <div class="flex flex-wrap gap-1 items-center mt-2 pt-2 border-t border-border">
              <span class="text-[9px] text-text-muted mr-1">AI Emojis:</span>
              <span
                v-for="(emoji, word) in getClipEmojiMap(clip)"
                :key="word"
                class="chip chip-primary !text-[9px] !py-0.5 !px-1.5"
              >
                <span class="font-bold text-white mr-0.5">{{ word }}</span> {{ emoji }}
              </span>
            </div>
          </div>

          <!-- Card Footer: Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-border mt-auto">
            <div class="flex gap-2">
              <button class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1" @click="openPreview(clip)">
                <PlayCircle :size="13" /> Preview
              </button>
              <button class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 !border-amber-500/30 !text-amber-400 hover:!bg-amber-500/10" @click="openEditor(clip, index)">
                <Pencil :size="13" /> Edit
              </button>
            </div>
            <button
              class="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
              :disabled="clip.isDownloading"
              @click="downloadClip(clip)"
            >
              <span v-if="clip.isDownloading" class="spinner !w-3 !h-3 !border-2"></span>
              <Download v-else :size="13" />
              Render HD
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 flex flex-col items-center justify-center min-h-[300px]">
        <div class="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
          <Search :size="28" class="text-text-muted" />
        </div>
        <p class="text-base text-text-secondary">No Clip candidates loaded yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspace } from '../composables/useWorkspace'
import type { ClipCandidate } from '../types'
import {
  Youtube, Link2, Brain, VideoOff, CheckCircle, Film, ArrowLeft, Star,
  Clock, MessageSquare, PlayCircle, Pencil, Download, Search
} from 'lucide-vue-next'

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
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?\s*v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  const videoId = (match && match[2] && match[2].length === 11) ? match[2] : null
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : ''
}

const getActiveVideoTitle = (): string => {
  const activeVideo = history.value.find(v => v.id === id)
  let rawTitle = ''
  if (activeVideo && activeVideo.title && activeVideo.title !== 'Pending Title Fetch') {
    rawTitle = activeVideo.title
  } else {
    rawTitle = videoUrl.value || 'AI Workspace Processing'
  }
  
  if (rawTitle.startsWith('http://') || rawTitle.startsWith('https://')) {
    try {
      const urlObj = new URL(rawTitle)
      const vParam = urlObj.searchParams.get('v')
      if (vParam) {
        return `YouTube Video (${vParam})`
      }
      return `External Video (${urlObj.hostname})`
    } catch (e) {
      return rawTitle.length > 30 ? rawTitle.substring(0, 30) + '...' : rawTitle
    }
  }
  return rawTitle
}

const getClipEmojiMap = (clip: any) => {
  if (clip.emojiMap && Object.keys(clip.emojiMap).length > 0) {
    return clip.emojiMap
  }
  const reason = (clip.reason || '').toLowerCase()
  const map: Record<string, string> = {}
  if (reason.includes('kocak') || reason.includes('lucu') || reason.includes('komedi') || reason.includes('momen kocak')) {
    map['lucu'] = '😂'
    map['kocak'] = '🤣'
  }
  if (reason.includes('sukses') || reason.includes('kaya') || reason.includes('bisnis') || reason.includes('branded') || reason.includes('branded mahal')) {
    map['bisnis'] = '💼'
    map['branded'] = '💎'
  }
  if (reason.includes('hebat') || reason.includes('kuat')) {
    map['hebat'] = '💪'
  }
  if (reason.includes('gila') || reason.includes('heran') || reason.includes('menggelitik')) {
    map['heran'] = '🤯'
  }
  if (Object.keys(map).length === 0) {
    map['momen'] = '🔥'
    map['viral'] = '🚀'
  }
  return map
}

const getScoreColor = (score: number) => {
  const pct = score * 10
  if (pct >= 85) return '#10B981'
  if (pct >= 70) return '#F59E0B'
  return '#EC4899'
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
.score-circle {
  animation: score-draw 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@keyframes score-draw {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}
</style>
