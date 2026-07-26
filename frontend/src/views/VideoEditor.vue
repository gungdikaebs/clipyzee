<template>
  <div v-if="isLoaded && activeClip" class="w-full p-4">
    <!-- Editor Top Control Bar -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <button class="btn-secondary text-xs flex items-center gap-1.5" @click="onClose">
          <ArrowLeft :size="14" />
          Back to Candidates
        </button>
        <h2 class="font-heading text-lg font-bold text-text-primary">Clipyzee Editor Suite</h2>
        <span class="chip chip-primary">Editing Clip #{{ currentEditingClipIndex !== null ? currentEditingClipIndex + 1 : 1 }}</span>
      </div>
      <button class="btn-primary text-sm flex items-center gap-2" @click="onRender">
        <Film :size="16" />
        Render HD Clip
      </button>
    </div>

    <!-- Main Split Panels -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
      <!-- Left Panel: Video Preview -->
      <div class="md:col-span-7">
        <div class="glass-card p-4 flex flex-col items-center justify-center relative" style="height: 560px;">
          <!-- Preview Label -->
          <div class="absolute top-4 left-4 right-4 z-10 flex justify-between items-center text-xs text-text-secondary">
            <span class="flex items-center gap-1 font-bold uppercase">
              <Eye :size="12" class="text-accent" /> Crop Preview
            </span>
            <span class="font-black text-accent">{{ editorState.aspectRatio }} Mode</span>
          </div>

          <!-- Video frame -->
          <div :style="previewFrameStyle" class="flex items-center justify-center bg-black border border-border relative overflow-hidden">
            <video
              v-if="activeClip && activeClip.rawVideoPath"
              id="editor-video-player"
              :src="`${API_BASE}/video/download?path=${encodeURIComponent(activeClip.rawVideoPath || '')}`"
              controls
              :style="playerWrapperStyle"
              @timeupdate="onTimeUpdate"
              @mousedown="onDragStart"
              class="absolute"
              style="cursor: grab; max-width: none !important;"
            ></video>
            <div v-else class="w-full h-full flex items-center justify-center text-text-muted text-sm">
              No local preview clip available
            </div>

            <!-- Live Subtitle Overlay -->
            <div class="absolute bottom-[15%] left-0 right-0 z-10 pointer-events-none px-4">
              <div class="text-center w-full">
                <div class="flex flex-wrap justify-center gap-1">
                  <span
                    v-for="(w, wIdx) in activeSubtitleWords"
                    :key="wIdx"
                    :style="getWordPreviewStyle(w)"
                  >
                    {{ formatWordWithEmoji(w) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Inspector -->
      <div class="md:col-span-5 flex flex-col overflow-hidden" style="height: 560px;">
        <div class="glass-card p-4 flex flex-col h-full overflow-hidden">
          <!-- Subtitle Style Presets -->
          <div class="mb-4">
            <div class="text-xs font-bold text-text-secondary mb-2 flex items-center gap-1.5">
              <Palette :size="13" class="text-amber-400" /> Subtitle Style Preset
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="style in subtitleStyles"
                :key="style.value"
                :class="[
                  'p-2.5 rounded-lg text-left transition-all cursor-pointer',
                  editorState.subtitleStyle === style.value
                    ? 'border border-accent bg-accent/10'
                    : 'border border-border bg-white/[0.03] hover:bg-white/[0.05]'
                ]"
                @click="editorState.subtitleStyle = style.value"
              >
                <div class="text-[10px] font-bold text-text-muted mb-1">{{ style.text.split(' ')[0] }}</div>
                <span :class="['style-preview-text', style.value.toLowerCase()]">{{ style.text.substring(0, 12) }}</span>
              </button>
            </div>
          </div>

          <!-- Aspect Ratio -->
          <div class="mb-4">
            <div class="text-xs font-bold text-text-secondary mb-2 flex items-center gap-1.5">
              <RectangleHorizontal :size="13" class="text-emerald-400" /> Dimensions Layout
            </div>
            <select v-model="editorState.aspectRatio" class="input-dark text-sm py-2">
              <option v-for="ar in aspectRatios" :key="ar.value" :value="ar.value">{{ ar.text }}</option>
            </select>
          </div>

          <!-- CropX Slider -->
          <div v-if="editingSegments.length > 0 && editingSegments[activeSegmentIndex] && editorState.aspectRatio !== '16:9'" class="mb-4">
            <div class="text-xs font-bold text-text-secondary mb-1 flex items-center gap-1.5">
              <Crop :size="13" class="text-accent" /> Crop Position
            </div>
            <div class="flex items-center gap-3">
              <input
                type="range"
                v-model.number="editingSegments[activeSegmentIndex].cropX"
                @input="editorState.cropX = editingSegments[activeSegmentIndex].cropX"
                min="0" max="100" step="1"
                class="flex-1 accent-accent h-1.5"
              />
              <span class="text-xs font-bold text-text-secondary w-10 text-right">{{ editingSegments[activeSegmentIndex].cropX }}%</span>
            </div>
          </div>

          <div class="border-t border-border mb-4"></div>

          <!-- Word Level Stylist -->
          <div class="flex flex-col flex-1 overflow-hidden">
            <div class="text-xs font-bold text-text-secondary mb-2 flex items-center gap-1.5">
              <Type :size="13" class="text-blue-400" /> Subtitle word overrides
            </div>

            <div v-if="editingSegments.length > 0 && editingSegments[activeSegmentIndex]" class="bg-black/30 rounded-lg p-3 mb-3 border border-border">
              <div class="text-[10px] font-bold text-text-muted mb-2 flex items-center gap-1">
                <Palette :size="10" class="text-accent" /> Word Stylist (Select a word to color)
              </div>
              <div class="flex flex-wrap gap-1 mb-2">
                <button
                  v-for="(w, wIdx) in editingSegments[activeSegmentIndex].words"
                  :key="wIdx"
                  :class="[
                    'text-xs font-bold px-2 py-0.5 rounded transition-all',
                    selectedWordIndex === wIdx
                      ? 'bg-accent/20 ring-1 ring-accent'
                      : 'bg-white/5 hover:bg-white/10'
                  ]"
                  :style="{
                    color: w.textColor || '#fff',
                    textShadow: w.outlineColor ? `1px 1px 0px ${w.outlineColor}` : 'none'
                  }"
                  @click="selectWord(Number(wIdx))"
                >
                  {{ w.text }}
                </button>
              </div>

              <!-- Color pickers -->
              <div v-if="selectedWordIndex !== null && editingSegments[activeSegmentIndex].words[selectedWordIndex]" class="mt-2 p-2 bg-black/40 rounded space-y-2">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <div class="text-[10px] text-text-muted mb-1">Text Color</div>
                    <select
                      v-model="editingSegments[activeSegmentIndex].words[selectedWordIndex].textColor"
                      class="input-dark text-xs py-1.5"
                    >
                      <option v-for="c in textColors" :key="c.value" :value="c.value">{{ c.name }}</option>
                    </select>
                  </div>
                  <div>
                    <div class="text-[10px] text-text-muted mb-1">Outline Color</div>
                    <select
                      v-model="editingSegments[activeSegmentIndex].words[selectedWordIndex].outlineColor"
                      class="input-dark text-xs py-1.5"
                    >
                      <option v-for="c in outlineColors" :key="c.value" :value="c.value">{{ c.name }}</option>
                    </select>
                  </div>
                </div>
                <button
                  class="w-full text-xs py-1.5 rounded-lg bg-red-500/15 text-red-400 font-bold hover:bg-red-500/25 transition-colors flex items-center justify-center gap-1"
                  @click="splitSegmentAtWord(activeSegmentIndex, selectedWordIndex)"
                >
                  <Scissors :size="12" /> Split Segment Here
                </button>
              </div>

              <!-- Live Preview -->
              <div class="mt-3 text-center p-2 rounded bg-black/60 border border-border" style="min-height: 42px;">
                <div class="text-[9px] text-text-muted text-left font-bold">Live Styled Preview:</div>
                <div class="text-xs font-black uppercase flex flex-wrap justify-center mt-1 gap-1 tracking-wide">
                  <span
                    v-for="(w, wIdx) in getSegmentWords(editingSegments[activeSegmentIndex])"
                    :key="wIdx"
                    :style="{
                      color: w.textColor || getPresetDefaultColor(),
                      textShadow: w.outlineColor ? `2px 2px 0px ${w.outlineColor}` : `2px 2px 0px ${getPresetDefaultOutline()}`
                    }"
                  >
                    {{ formatWordWithEmoji(w) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Segment list -->
            <div class="flex-1 overflow-y-auto pr-1 pb-1" style="max-height: 160px;">
              <div
                v-for="(seg, idx) in editingSegments"
                :key="idx"
                :class="[
                  'mb-2 p-2 rounded-lg border transition-all cursor-pointer',
                  computedActiveSegmentIndex === idx
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-white/[0.01] hover:bg-white/[0.03]'
                ]"
                @click="selectSegment(idx)"
              >
                <div class="flex justify-between items-center mb-1">
                  <span class="text-[10px] text-text-muted">{{ formatTime(seg.start) }} - {{ formatTime(seg.end) }}</span>
                  <PenLine v-if="activeSegmentIndex === idx" :size="10" class="text-accent" />
                </div>
                <input
                  v-model="seg.text"
                  class="input-dark text-xs py-1.5 !bg-black/20"
                  @focus="activeSegmentIndex = idx; selectedWordIndex = null"
                  @input="syncWordsOnTextChange(seg)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline Track -->
    <div class="mt-4 px-4 py-3 bg-black/40 border border-border rounded-xl">
      <div class="text-xs font-bold text-text-muted mb-2 flex justify-between items-center">
        <span class="flex items-center gap-1.5">
          <Ruler :size="13" /> Video Timeline Track
        </span>
        <span class="text-[10px] text-text-muted">Click on track to seek / scrub playhead</span>
      </div>

      <div
        id="timeline-scroll-container"
        class="overflow-x-auto py-3 relative"
        style="min-height: 80px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);"
      >
        <div
          id="timeline-scrub-track"
          class="relative"
          :style="{
            width: `${(activeClip.end - activeClip.start) * 20}px`,
            height: '60px'
          }"
          @click="onTimelineTrackClick"
          style="cursor: pointer;"
        >
          <!-- Playhead -->
          <div
            class="absolute bg-accent"
            :style="{
              left: `${(playerCurrentTime - activeClip.start) * 20}px`,
              width: '2px',
              height: '100%',
              top: '0',
              zIndex: 10,
              transition: 'left 0.1s linear',
              boxShadow: '0 0 8px #FF6B4A'
            }"
          >
            <div class="w-2 h-2 bg-accent rounded-full -ml-[3px] -mt-[3px]"></div>
          </div>

          <!-- Segment blocks -->
          <div
            v-for="(seg, idx) in editingSegments"
            :key="idx"
            :class="[
              'timeline-block absolute p-2 rounded border transition-all overflow-hidden',
              activeSegmentIndex === idx
                ? 'active-block border-accent bg-accent/20'
                : 'border-border bg-white/5'
            ]"
            :style="{
              left: `${(seg.start - activeClip.start) * 20}px`,
              width: `${(seg.end - seg.start) * 20}px`,
              height: '46px',
              top: '7px'
            }"
            @click.stop="selectSegment(idx)"
          >
            <div class="text-[9px] text-text-muted font-bold leading-none truncate">
              {{ formatTime(seg.start) }} - {{ formatTime(seg.end) }}
            </div>
            <div class="text-[11px] text-text-primary font-medium mt-0.5 leading-tight truncate">
              {{ seg.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else class="w-full text-center py-16">
    <div class="spinner mx-auto mb-4"></div>
    <p class="text-xs text-text-muted">Loading editor components...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspace } from '../composables/useWorkspace'
import {
  ArrowLeft, Film, Eye, Palette, RectangleHorizontal, Crop, Type, Scissors,
  PenLine, Ruler
} from 'lucide-vue-next'

const props = defineProps<{
  videoId: string;
  clipIndex: string;
}>()

const router = useRouter()
const {
  API_BASE,
  clips,
  currentEditingClipIndex,
  fullTranscript,
  fetchHistory,
  loadHistoryItem,
  history,
  activeClip,
  appendLog,
  downloadClip,
  saveWorkspaceState
} = useWorkspace()

const isLoaded = ref(false)
const editingSegments = ref<any[]>([])

const editorState = ref({
  aspectRatio: '9:16',
  subtitleStyle: 'DEFAULT',
  cropX: 50
})

onMounted(async () => {
  const idx = Number(props.clipIndex)
  currentEditingClipIndex.value = idx

  if (clips.value.length === 0) {
    await fetchHistory()
    const target = history.value.find(v => v.id === props.videoId)
    const loaded = loadHistoryItem(target)
    if (!loaded) {
      router.push('/studio/import')
      return
    }
  }

  const clip = clips.value[idx]
  if (!clip) {
    router.push('/studio/import')
    return
  }

  editorState.value = {
    aspectRatio: clip.aspectRatio || '9:16',
    subtitleStyle: clip.subtitleStyle || 'DEFAULT',
    cropX: clip.cropX !== undefined ? clip.cropX : 50
  }

  let segments = []
  if (clip.customTranscript) {
    segments = JSON.parse(JSON.stringify(clip.customTranscript))
  } else {
    const rawSegments = fullTranscript.value.filter(seg => seg.end > clip.start && seg.start < clip.end)
    segments = JSON.parse(JSON.stringify(rawSegments))
  }
  
  editingSegments.value = segments.map((seg: any) => {
    if (seg.cropX === undefined) {
      seg.cropX = clip.cropX !== undefined ? clip.cropX : 50
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

  window.addEventListener('keydown', handleSpacebar)
  isLoaded.value = true
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSpacebar)
})

const handleSpacebar = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }
  if (e.code === 'Space') {
    e.preventDefault()
    const video = document.getElementById('editor-video-player') as HTMLVideoElement | null
    if (video) {
      if (video.paused) {
        video.play()
      } else {
        video.pause()
      }
    }
  }
}

const activeSegmentIndex = ref(0)
const selectedWordIndex = ref<number | null>(null)
const playerCurrentTime = ref(0)

const aspectRatios = [
  { text: 'Vertical (9:16)', value: '9:16' },
  { text: 'Square (1:1)', value: '1:1' },
  { text: 'Standard (4:3)', value: '4:3' },
  { text: 'Landscape (16:9)', value: '16:9' }
]

const subtitleStyles = [
  { text: 'HORMOZI (Solo Yellow)', value: 'HORMOZI' },
  { text: 'MRBEAST (Alternating Neon)', value: 'MRBEAST' },
  { text: 'CYBERPUNK (Neon Green)', value: 'CYBERPUNK' },
  { text: 'CUTE (Sweet Pink)', value: 'CUTE' },
  { text: 'MINIMALIST (Clean White)', value: 'MINIMALIST' }
]

const textColors = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Pink', value: '#FF00FF' },
  { name: 'Cyan', value: '#00FFFF' },
  { name: 'Red', value: '#FF0000' }
]

const outlineColors = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Grey', value: '#222222' },
  { name: 'None', value: '' }
]

const activeSegment = computed(() => {
  const t = playerCurrentTime.value
  return editingSegments.value.find(seg => t >= seg.start && t <= seg.end)
})

const computedActiveSegmentIndex = computed(() => {
  const t = playerCurrentTime.value
  return editingSegments.value.findIndex(seg => t >= seg.start && t <= seg.end)
})

watch(computedActiveSegmentIndex, (newIdx) => {
  if (newIdx !== -1) {
    activeSegmentIndex.value = newIdx
  }
})

watch(activeSegment, (newSeg) => {
  if (newSeg) {
    editorState.value.cropX = newSeg.cropX !== undefined ? newSeg.cropX : 50
  }
})

watch(activeSegmentIndex, (newIdx) => {
  const seg = editingSegments.value[newIdx]
  if (seg) {
    editorState.value.cropX = seg.cropX !== undefined ? seg.cropX : 50
  }
})

const selectSegment = (idx: number) => {
  activeSegmentIndex.value = idx
  selectedWordIndex.value = null
  const seg = editingSegments.value[idx]
  if (seg && activeClip.value) {
    const video = document.getElementById('editor-video-player') as HTMLVideoElement | null
    if (video) {
      const relativeTime = Math.max(0, seg.start - activeClip.value.start)
      video.currentTime = relativeTime
      playerCurrentTime.value = seg.start
    }
  }
}

const selectWord = (wIdx: number) => {
  selectedWordIndex.value = wIdx
  const seg = editingSegments.value[activeSegmentIndex.value]
  if (seg && seg.words && seg.words[wIdx] && activeClip.value) {
    const video = document.getElementById('editor-video-player') as HTMLVideoElement | null
    if (video) {
      const targetTime = seg.words[wIdx].start
      const relativeTime = Math.max(0, targetTime - activeClip.value.start)
      video.currentTime = relativeTime
      playerCurrentTime.value = targetTime
    }
  }
}

const getSegmentWords = (seg: any) => {
  if (!seg) return []
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
  return seg.words
}

const syncWordsOnTextChange = (seg: any) => {
  if (!seg) return
  const currentWords = seg.text.trim().split(/\s+/).filter((w: string) => w.length > 0)
  const oldWords = seg.words || []
  const duration = seg.end - seg.start
  const wordDuration = duration / Math.max(1, currentWords.length)
  
  seg.words = currentWords.map((word: string, idx: number) => {
    const matchingOld = oldWords[idx]
    return {
      text: word,
      start: seg.start + idx * wordDuration,
      end: seg.start + (idx + 1) * wordDuration,
      textColor: matchingOld && matchingOld.text.toLowerCase() === word.toLowerCase() ? matchingOld.textColor : '',
      outlineColor: matchingOld && matchingOld.text.toLowerCase() === word.toLowerCase() ? matchingOld.outlineColor : ''
    }
  })
  
  if (selectedWordIndex.value !== null && selectedWordIndex.value >= seg.words.length) {
    selectedWordIndex.value = null
  }
}

const getPresetDefaultColor = () => {
  const styleName = editorState.value.subtitleStyle || 'DEFAULT'
  const defaultInactiveColors: Record<string, string> = {
    DEFAULT: '#FFFFFF',
    HORMOZI: '#FFFFFF',
    MRBEAST: '#FFFFFF',
    CYBERPUNK: '#FFFFFF',
    CUTE: '#FFFFFF',
    MINIMALIST: '#FFFFFF'
  }
  return defaultInactiveColors[styleName] || '#FFFFFF'
}

const getPresetDefaultOutline = () => {
  const styleName = editorState.value.subtitleStyle || 'DEFAULT'
  const defaultOutlines: Record<string, string> = {
    DEFAULT: '#000000',
    HORMOZI: '#000000',
    MRBEAST: '#000000',
    CYBERPUNK: '#000000',
    CUTE: '#82004B',
    MINIMALIST: ''
  }
  return defaultOutlines[styleName] || '#000000'
}

const activeSubtitleWords = computed(() => {
  const seg = activeSegment.value
  if (!seg) return []
  const words = getSegmentWords(seg)
  words.forEach((w: any) => {
    if (w.textColor !== undefined || w.outlineColor !== undefined) {
      // reactive dependency tracking
    }
  })
  
  const t = playerCurrentTime.value
  const activeIdx = words.findIndex((w: any) => t >= w.start && t <= w.end)
  if (activeIdx === -1) {
    return words.slice(0, 4)
  }
  
  const start = Math.max(0, activeIdx - 1)
  const end = Math.min(words.length, activeIdx + 3)
  return words.slice(start, end)
})

const isWordActiveSpoken = (w: any) => {
  const t = playerCurrentTime.value
  return t >= w.start && t <= w.end
}

const formatWordWithEmoji = (w: any) => {
  if (!w || !w.text) return ''
  let text = w.text
  if (activeClip.value && activeClip.value.emojiMap) {
    const cleanWord = w.text.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
    for (const [key, emoji] of Object.entries(activeClip.value.emojiMap)) {
      const cleanKey = key.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
      if (cleanWord === cleanKey || cleanWord.includes(cleanKey) || cleanKey.includes(cleanWord)) {
        text += ` ${emoji}`
        break
      }
    }
  }
  const styleName = editorState.value.subtitleStyle || 'DEFAULT'
  if (styleName === 'HORMOZI' || styleName === 'MRBEAST') {
    return text.toUpperCase()
  }
  return text
}

const getWordPreviewStyle = (w: any) => {
  const isActive = isWordActiveSpoken(w)
  const styleName = editorState.value.subtitleStyle || 'DEFAULT'
  const activeColors: Record<string, string> = {
    DEFAULT: '#FFFF00',
    HORMOZI: '#FFFF00',
    CYBERPUNK: '#00FF00',
    CUTE: '#FF00FF',
    MINIMALIST: '#FFFF00'
  }
  const defaultInactiveColors: Record<string, string> = {
    DEFAULT: '#FFFFFF',
    HORMOZI: '#FFFFFF',
    MRBEAST: '#FFFFFF',
    CYBERPUNK: '#FFFFFF',
    CUTE: '#FFFFFF',
    MINIMALIST: '#FFFFFF'
  }
  
  let primaryColor = w.textColor
  if (isActive) {
    if (styleName === 'MRBEAST') {
      const colors = ['#FFFF00', '#00FFFF', '#00FF00', '#FF3366']
      const charSum = w.text.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
      primaryColor = colors[charSum % colors.length]
    } else {
      primaryColor = activeColors[styleName] || '#FFFF00'
    }
  } else {
    primaryColor = w.textColor || defaultInactiveColors[styleName] || '#FFFFFF'
  }
    
  const outlineColor = w.outlineColor || (styleName === 'MINIMALIST' ? '' : '#000000')
  
  const fontStyle: Record<string, any> = {
    DEFAULT: { fontFamily: "'Arial Black', sans-serif", fontSize: '24px' },
    HORMOZI: { fontFamily: "'Arial Black', sans-serif", fontSize: '25px' },
    MRBEAST: { fontFamily: "'Impact', sans-serif", fontSize: '28px' },
    CYBERPUNK: { fontFamily: "'Impact', sans-serif", fontSize: '28px' },
    CUTE: { fontFamily: "'Comic Sans MS', sans-serif", fontSize: '22px' },
    MINIMALIST: { fontFamily: "'Arial', sans-serif", fontSize: '20px' }
  }
  
  const selectedFont = fontStyle[styleName] || fontStyle.DEFAULT
  
  let transform = 'scale(1)'
  if (isActive) {
    if (styleName === 'HORMOZI') {
      transform = 'scale(1.2) rotate(-3deg)'
    } else if (styleName === 'MRBEAST') {
      transform = 'scale(1.25) rotate(3deg)'
    } else if (styleName === 'CYBERPUNK') {
      transform = 'scale(1.1) translateY(-2px)'
    }
  }
  
  return {
    color: primaryColor,
    fontFamily: selectedFont.fontFamily,
    fontSize: selectedFont.fontSize,
    textShadow: outlineColor ? `2px 2px 0px ${outlineColor}, -2px -2px 0px ${outlineColor}, 2px -2px 0px ${outlineColor}, -2px 2px 0px ${outlineColor}` : 'none',
    marginRight: '6px',
    display: 'inline-block',
    transform: transform,
    transition: 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.1s ease',
    fontWeight: '900',
    letterSpacing: '1px'
  }
}

const playerWrapperStyle = computed(() => {
  const ratio = editorState.value.aspectRatio;
  const cropX = editorState.value.cropX !== undefined ? editorState.value.cropX : 50;
  
  if (ratio === '9:16') {
    const containerWidth = 260;
    const height = 462;
    const iframeWidth = height * 16 / 9;
    const leftOffset = (containerWidth - iframeWidth) * (cropX / 100);
    return {
      position: 'absolute',
      top: '0',
      left: `${leftOffset}px`,
      width: `${iframeWidth}px`,
      height: `${height}px`,
      maxWidth: 'none',
      pointerEvents: 'auto'
    } as any
  } else if (ratio === '1:1') {
    const containerWidth = 360;
    const height = 360;
    const iframeWidth = height * 16 / 9;
    const leftOffset = (containerWidth - iframeWidth) * (cropX / 100);
    return {
      position: 'absolute',
      top: '0',
      left: `${leftOffset}px`,
      width: `${iframeWidth}px`,
      height: `${height}px`,
      maxWidth: 'none',
      pointerEvents: 'auto'
    } as any
  } else if (ratio === '4:3') {
    const containerWidth = 480;
    const height = 360;
    const iframeWidth = height * 16 / 9;
    const leftOffset = (containerWidth - iframeWidth) * (cropX / 100);
    return {
      position: 'absolute',
      top: '0',
      left: `${leftOffset}px`,
      width: `${iframeWidth}px`,
      height: `${height}px`,
      maxWidth: 'none',
      pointerEvents: 'auto'
    } as any
  } else {
    return {
      position: 'relative',
      width: '100%',
      height: '100%',
      left: '0',
      pointerEvents: 'auto'
    } as any
  }
})

const previewFrameStyle = computed(() => {
  const ratio = editorState.value.aspectRatio;
  if (ratio === '9:16') {
    return {
      width: '260px',
      height: '462px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }
  } else if (ratio === '1:1') {
    return {
      width: '360px',
      height: '360px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }
  } else if (ratio === '4:3') {
    return {
      width: '480px',
      height: '360px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }
  } else {
    return {
      width: '100%',
      maxWidth: '560px',
      height: '315px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }
  }
})

const onTimeUpdate = (e: Event) => {
  const target = e.target as HTMLVideoElement
  if (activeClip.value) {
    playerCurrentTime.value = Number(activeClip.value.start) + target.currentTime
  }
}

// Drag & Pan controller
const isDragging = ref(false)
const dragStartPercent = ref(50)
const dragStartX = ref(0)

const onDragStart = (e: MouseEvent) => {
  if (editorState.value.aspectRatio === '16:9') return
  isDragging.value = true
  dragStartX.value = e.clientX
  
  const currentSeg = editingSegments.value[activeSegmentIndex.value]
  dragStartPercent.value = currentSeg && currentSeg.cropX !== undefined ? currentSeg.cropX : 50
  
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

const onDragMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const diffX = e.clientX - dragStartX.value
  
  const deltaPercent = Math.round(diffX / 5)
  let newCrop = dragStartPercent.value - deltaPercent
  newCrop = Math.max(0, Math.min(100, newCrop))
  
  editorState.value.cropX = newCrop
  if (editingSegments.value[activeSegmentIndex.value]) {
    editingSegments.value[activeSegmentIndex.value].cropX = newCrop
  }
}

const onDragEnd = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

const onClose = async () => {
  const idx = Number(props.clipIndex)
  if (idx !== null && idx >= 0 && idx < clips.value.length) {
    const clip = clips.value[idx]
    if (clip) {
      clip.customTranscript = editingSegments.value
      clip.aspectRatio = editorState.value.aspectRatio
      clip.subtitleStyle = editorState.value.subtitleStyle
      clip.cropX = editorState.value.cropX
      await saveWorkspaceState()
    }
  }
  router.push(`/studio/candidates/${props.videoId}`)
}

const onRender = async () => {
  const idx = Number(props.clipIndex)
  if (idx !== null && idx >= 0 && idx < clips.value.length) {
    const clip = clips.value[idx]
    if (clip) {
      clip.customTranscript = editingSegments.value
      clip.aspectRatio = editorState.value.aspectRatio
      clip.subtitleStyle = editorState.value.subtitleStyle
      clip.cropX = editorState.value.cropX
      clip.isEdited = true
      appendLog(`[EDITOR] Saved clip #${idx + 1} configuration`)
      
      await saveWorkspaceState()
      router.push(`/studio/candidates/${props.videoId}`)
      downloadClip(clip)
    }
  }
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const onTimelineTrackClick = (e: MouseEvent) => {
  if (!activeClip.value) return
  const track = document.getElementById('timeline-scrub-track') as HTMLDivElement | null
  if (!track) return
  const rect = track.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const relativeClickSeconds = clickX / 20
  
  const clipStart = Number(activeClip.value.start)
  const targetAbsoluteTime = clipStart + relativeClickSeconds
  
  const video = document.getElementById('editor-video-player') as HTMLVideoElement | null
  if (video) {
    const targetCurrentTime = Math.max(0, targetAbsoluteTime - clipStart)
    video.currentTime = Math.min(video.duration || (Number(activeClip.value.end) - clipStart), targetCurrentTime)
    playerCurrentTime.value = clipStart + video.currentTime
  }
}

const splitSegmentAtWord = (segIdx: number, wordIdx: number) => {
  const seg = editingSegments.value[segIdx]
  if (!seg || !seg.words || seg.words.length <= 1) return
  
  const wordsBefore = seg.words.slice(0, wordIdx)
  const wordsAfter = seg.words.slice(wordIdx)
  
  if (wordsBefore.length === 0 || wordsAfter.length === 0) return
  
  const seg1End = wordsBefore[wordsBefore.length - 1].end
  const seg2Start = wordsAfter[0].start
  
  const seg1Text = wordsBefore.map((w: any) => w.text).join(' ')
  const seg2Text = wordsAfter.map((w: any) => w.text).join(' ')
  
  const seg1 = {
    ...seg,
    end: seg1End,
    text: seg1Text,
    words: wordsBefore
  }
  
  const seg2 = {
    ...seg,
    start: seg2Start,
    text: seg2Text,
    words: wordsAfter,
    cropX: seg.cropX !== undefined ? seg.cropX : 50
  }
  
  editingSegments.value.splice(segIdx, 1, seg1, seg2)
  selectedWordIndex.value = null
  activeSegmentIndex.value = segIdx + 1
  appendLog(`[EDITOR] Split segment #${segIdx + 1} at word "${wordsAfter[0].text}"`)
}

watch(playerCurrentTime, (newTime) => {
  if (!activeClip.value) return
  const container = document.getElementById('timeline-scroll-container')
  if (!container) return
  
  const relativePlayheadPx = (newTime - activeClip.value.start) * 20
  const containerWidth = container.clientWidth
  container.scrollLeft = relativePlayheadPx - containerWidth / 2
})
</script>
