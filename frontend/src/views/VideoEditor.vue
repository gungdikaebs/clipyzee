<template>
  <div v-if="isLoaded && activeClip" class="w-100">
    <!-- Editor Top Control Bar -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div class="d-flex align-center">
        <v-btn
          variant="outlined"
          color="grey"
          prepend-icon="mdi-arrow-left"
          class="text-none font-weight-bold mr-4 rounded-lg"
          @click="onClose"
        >
          Back to Candidates
        </v-btn>
        <h2 class="text-h5 font-weight-bold text-white mb-0" style="font-family: 'Outfit', sans-serif;">Clipyzee Editor Suite</h2>
        <v-chip size="small" color="primary" variant="tonal" class="ml-4 font-weight-bold">
          Editing Clip #{{ currentEditingClipIndex !== null ? currentEditingClipIndex + 1 : 1 }}
        </v-chip>
      </div>
      <div>
        <v-btn color="success" variant="flat" class="px-8 font-weight-bold rounded-lg gradient-btn" @click="onRender">
          <v-icon icon="mdi-movie-open" class="mr-2"></v-icon> Render HD Clip
        </v-btn>
      </div>
    </div>

    <!-- Main Split Panels -->
    <v-row>
      <!-- Left Panel: Large Video Frame and Overlay -->
      <v-col cols="12" md="7">
        <v-card class="bg-black bg-opacity-40 border border-white border-opacity-5 rounded-xl pa-4 d-flex flex-column align-center justify-center relative-content" style="height: 560px;">
          <div class="text-caption text-grey-lighten-2 mb-3 w-100 d-flex justify-space-between align-center" style="position: absolute; top: 16px; left: 16px; right: 16px; z-index: 5;">
            <span class="d-flex align-center font-weight-bold text-uppercase"><v-icon icon="mdi-eye" class="mr-1 text-primary" size="small"></v-icon> Crop Preview</span>
            <span class="font-weight-black text-primary">{{ editorState.aspectRatio }} Mode</span>
          </div>

          <div :style="previewFrameStyle" class="d-flex align-center justify-center bg-black border border-white border-opacity-10 relative-content" style="position: relative; overflow: hidden;">
            <!-- HTML5 Native Local Video Player -->
            <video
              v-if="activeClip && activeClip.rawVideoPath"
              id="editor-video-player"
              :src="`${API_BASE}/video/download?path=${encodeURIComponent(activeClip.rawVideoPath || '')}`"
              controls
              class="absolute-center"
              :style="playerWrapperStyle"
              @timeupdate="onTimeUpdate"
              @mousedown="onDragStart"
              style="cursor: grab; max-width: none !important;"
            ></video>
            <div v-else class="w-100 h-100 d-flex align-center justify-center text-grey">
              No local preview clip available
            </div>
            
            <!-- Live Subtitle Overlay -->
            <div class="live-subtitle-overlay d-flex justify-center align-center w-100" style="position: absolute; bottom: 15%; left: 0; right: 0; pointer-events: none; z-index: 10; padding: 0 16px;">
              <div class="text-center w-100">
                <div class="d-flex flex-wrap justify-center" style="gap: 4px;">
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
        </v-card>
      </v-col>

      <!-- Right Panel: Subtitles Inspector and styling -->
      <v-col cols="12" md="5" class="d-flex flex-column overflow-hidden" style="height: 560px;">
        <v-card class="glass-card border border-white border-opacity-5 rounded-xl pa-4 d-flex flex-column h-100">
          <!-- Styles selection -->
          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-lighten-1 d-flex align-center">
              <v-icon icon="mdi-palette" class="mr-2 text-warning" size="small"></v-icon> Subtitle Style Preset
            </div>
            <v-row dense>
              <v-col cols="6" v-for="style in subtitleStyles" :key="style.value" class="mb-1">
                <v-card
                  :class="['pa-3', 'style-preset-card', editorState.subtitleStyle === style.value ? 'border-primary border border-opacity-100 bg-primary bg-opacity-10' : 'bg-white bg-opacity-5']"
                  @click="editorState.subtitleStyle = style.value"
                  style="min-height: 55px;"
                >
                  <div class="text-caption font-weight-bold text-grey mb-1">{{ style.text.split(' ')[0] }}</div>
                  <span :class="['style-preview-text', style.value.toLowerCase()]">{{ style.text.substring(0, 12) }}</span>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Aspect selector -->
          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-lighten-1 d-flex align-center">
              <v-icon icon="mdi-aspect-ratio" class="mr-2 text-success" size="small"></v-icon> Dimensions Layout
            </div>
            <v-select
              v-model="editorState.aspectRatio"
              :items="aspectRatios"
              item-title="text"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              bg-color="rgba(255,255,255,0.02)"
              class="rounded-lg"
            ></v-select>
          </div>

          <!-- Pan coordinates cropX slider -->
          <div v-if="editingSegments.length > 0 && editingSegments[activeSegmentIndex] && editorState.aspectRatio !== '16:9'" class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-1 text-grey-lighten-1 d-flex align-center">
              <v-icon icon="mdi-crop" class="mr-2 text-primary" size="small"></v-icon> Drag / Adjust Crop Coordinates
            </div>
            <v-slider
              v-model="editingSegments[activeSegmentIndex].cropX"
              @update:model-value="editorState.cropX = $event"
              min="0"
              max="100"
              step="1"
              hide-details
              color="primary"
              track-color="rgba(255,255,255,0.1)"
              class="align-center"
            >
              <template v-slot:append>
                <span class="text-caption font-weight-bold text-grey-lighten-1" style="min-width: 45px; display: inline-block; text-align: right;">
                  {{ editingSegments[activeSegmentIndex].cropX }}%
                </span>
              </template>
            </v-slider>
          </div>

          <v-divider class="mb-4 border-opacity-10"></v-divider>

          <!-- Word level colorist and list -->
          <div class="d-flex flex-column flex-grow-1 overflow-hidden">
            <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-lighten-1 d-flex align-center">
              <v-icon icon="mdi-text-box-edit" class="mr-2 text-info" size="small"></v-icon> Subtitle word overrides
            </div>

            <div v-if="editingSegments.length > 0 && editingSegments[activeSegmentIndex]" class="bg-black bg-opacity-30 rounded-lg pa-3 mb-3 border border-white border-opacity-5">
              <div class="text-caption font-weight-bold text-grey mb-2 d-flex align-center">
                <v-icon icon="mdi-palette-swatch" class="mr-1 text-primary" size="small"></v-icon> Word Stylist (Select a word to color)
              </div>
              <div class="d-flex flex-wrap gap-1 mb-2">
                <v-chip
                  v-for="(w, wIdx) in editingSegments[activeSegmentIndex].words"
                  :key="wIdx"
                  :color="selectedWordIndex === wIdx ? 'primary' : 'default'"
                  :variant="selectedWordIndex === wIdx ? 'flat' : 'tonal'"
                  size="small"
                  class="text-caption font-weight-bold px-2 py-0.5"
                  @click="selectWord(Number(wIdx))"
                  :style="{
                    color: w.textColor || '#fff',
                    textShadow: w.outlineColor ? `1px 1px 0px ${w.outlineColor}` : 'none'
                  }"
                >
                  {{ w.text }}
                </v-chip>
              </div>

              <!-- Color custom picks -->
              <div v-if="selectedWordIndex !== null && editingSegments[activeSegmentIndex].words[selectedWordIndex]" class="mt-2 pa-2 bg-black bg-opacity-40 rounded">
                <v-row dense align="center">
                  <v-col cols="6">
                    <div class="text-caption text-grey mb-1">Text Color</div>
                    <v-select
                      v-model="editingSegments[activeSegmentIndex].words[selectedWordIndex].textColor"
                      :items="textColors"
                      item-title="name"
                      item-value="value"
                      density="compact"
                      variant="outlined"
                      hide-details
                      bg-color="rgba(255,255,255,0.02)"
                    ></v-select>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-caption text-grey mb-1">Outline Color</div>
                    <v-select
                      v-model="editingSegments[activeSegmentIndex].words[selectedWordIndex].outlineColor"
                      :items="outlineColors"
                      item-title="name"
                      item-value="value"
                      density="compact"
                      variant="outlined"
                      hide-details
                      bg-color="rgba(255,255,255,0.02)"
                    ></v-select>
                  </v-col>
                </v-row>
                
                <!-- Split button action -->
                <v-row dense class="mt-2">
                  <v-col cols="12">
                    <v-btn
                      size="small"
                      color="error"
                      variant="tonal"
                      block
                      prepend-icon="mdi-scissors-cutting"
                      @click="splitSegmentAtWord(activeSegmentIndex, selectedWordIndex)"
                      class="text-none font-weight-bold rounded-lg"
                    >
                      Split Segment Here
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <!-- Live Styled Text Preview inside the sidebar card inspector -->
              <div class="mt-3 text-center pa-2 rounded bg-black bg-opacity-60 border border-white border-opacity-5" style="min-height: 48px;">
                <div class="text-caption text-grey text-left font-weight-bold" style="font-size: 10px !important;">Live Styled Preview:</div>
                <div class="text-subtitle-2 font-weight-black text-uppercase d-flex flex-wrap justify-center mt-1" style="gap: 4px; letter-spacing: 1px;">
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

            <div class="flex-grow-1 overflow-y-auto pr-1 pb-1" style="max-height: 160px;">
              <div
                v-for="(seg, idx) in editingSegments"
                :key="idx"
                :class="['mb-2', 'pa-2', 'rounded-lg', 'border', 'transition-all', computedActiveSegmentIndex === idx ? 'border-primary bg-primary bg-opacity-10 active-card-pulse' : 'border-white border-opacity-5 bg-white bg-opacity-1']"
                @click="selectSegment(idx)"
                style="cursor: pointer;"
              >
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption text-grey">{{ formatTime(seg.start) }} - {{ formatTime(seg.end) }}</span>
                  <v-icon v-if="activeSegmentIndex === idx" icon="mdi-pencil" size="x-small" color="primary"></v-icon>
                </div>
                <v-text-field
                  v-model="seg.text"
                  variant="outlined"
                  density="compact"
                  hide-details
                  bg-color="rgba(0,0,0,0.2)"
                  class="text-body-2"
                  @focus="activeSegmentIndex = idx; selectedWordIndex = null"
                  @input="syncWordsOnTextChange(seg)"
                ></v-text-field>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Timeline block scrollbar (CapCut style) -->
    <div class="mt-4 px-6 py-3 bg-black bg-opacity-40 border border-white border-opacity-5 rounded-xl">
      <div class="text-caption font-weight-bold mb-2 text-grey d-flex justify-space-between align-center">
        <span class="d-flex align-center">
          <v-icon icon="mdi-ruler-square" class="mr-2" size="small"></v-icon> Video Timeline Track
        </span>
        <span class="text-caption text-grey">Click on empty track areas to seek / scrub video playhead</span>
      </div>
      
      <div 
        id="timeline-scroll-container" 
        class="overflow-x-auto py-3 relative-content" 
        style="position: relative; min-height: 80px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);"
      >
        <div 
          id="timeline-scrub-track"
          class="position-relative" 
          :style="{
            width: `${(activeClip.end - activeClip.start) * 20}px`,
            height: '60px'
          }"
          @click="onTimelineTrackClick"
          style="cursor: pointer;"
        >
          <!-- Playhead indicator line -->
          <div 
            class="position-absolute bg-primary" 
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
            <div style="width: 8px; height: 8px; background: #FF6B4A; border-radius: 50%; margin-left: -3px; margin-top: -3px;"></div>
          </div>

          <!-- Absolute positioned segment blocks -->
          <div
            v-for="(seg, idx) in editingSegments"
            :key="idx"
            :class="['timeline-block', 'position-absolute', 'pa-2', 'rounded', 'border', 'transition-all', 'overflow-hidden', activeSegmentIndex === idx ? 'active-block border-primary bg-primary bg-opacity-20' : 'border-white border-opacity-5 bg-white bg-opacity-5']"
            :style="{
              left: `${(seg.start - activeClip.start) * 20}px`,
              width: `${(seg.end - seg.start) * 20}px`,
              height: '46px',
              top: '7px'
            }"
            @click.stop="selectSegment(idx)"
          >
            <div class="text-caption text-grey text-truncate font-weight-bold" style="font-size: 9px !important; line-height: 1;">
              {{ formatTime(seg.start) }} - {{ formatTime(seg.end) }}
            </div>
            <div class="text-caption text-white text-truncate font-weight-medium mt-0.5" style="font-size: 11px !important; line-height: 1.2;">
              {{ seg.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="w-100 text-center py-12">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    <div class="text-caption text-grey mt-4">Loading editor components...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspace } from '../composables/useWorkspace'

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
  downloadClip
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

  // Keyboard shortcut listener
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

const onClose = () => {
  router.push(`/studio/candidates/${props.videoId}`)
}

const onRender = () => {
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
    // Clamp currentTime to the actual video duration to prevent out of bounds resets
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
