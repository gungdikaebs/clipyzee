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
          <!-- Column 1: History -->
          <v-col cols="12" md="3">
            <v-card class="glass-card rounded-xl d-flex flex-column" elevation="10" style="height: 580px;">
              <v-card-title class="d-flex align-center py-4 px-6 border-b border-opacity-25">
                <v-icon icon="mdi-history" class="mr-3 text-primary" size="small"></v-icon>
                <span class="font-weight-bold text-subtitle-1">History</span>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-refresh" variant="text" size="small" :loading="isFetchingHistory" @click="fetchHistory"></v-btn>
              </v-card-title>
              <v-card-text class="pa-0 overflow-y-auto flex-grow-1" style="height: calc(580px - 70px);">
                <v-list v-if="history.length > 0" bg-color="transparent" class="pa-0">
                  <v-list-item
                    v-for="(item, index) in history"
                    :key="index"
                    class="hover-item px-4 py-3"
                    :active="currentVideoId === item.id"
                    @click="loadHistoryItem(item)"
                  >
                    <v-list-item-title class="font-weight-bold text-body-2 text-white text-truncate">
                      {{ item.title && item.title !== 'Pending Title Fetch' ? item.title : item.sourceUrl }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption text-grey mt-1">
                      {{ formatDate(item.createdAt) }}
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <v-icon icon="mdi-chevron-right" size="small" color="grey"></v-icon>
                    </template>
                  </v-list-item>
                </v-list>
                <div v-else class="h-100 d-flex flex-column align-center justify-center pa-6 text-center" style="min-height: 350px;">
                  <v-avatar color="rgba(255,255,255,0.02)" size="60" class="mb-4">
                    <v-icon icon="mdi-history" size="30" color="grey-darken-1"></v-icon>
                  </v-avatar>
                  <div class="text-body-2 text-grey">No history yet</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Column 2: Live Logs -->
          <v-col cols="12" md="4">
            <v-card class="glass-card rounded-xl d-flex flex-column" elevation="10" style="height: 580px;">
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

          <!-- Column 3: AI Results / Clip Candidates -->
          <v-col cols="12" md="5">
            <v-card class="glass-card rounded-xl d-flex flex-column" elevation="10" style="height: 580px;">
              <v-card-title class="d-flex align-center py-4 px-6 border-b border-opacity-25">
                <v-icon icon="mdi-timeline-clock" class="mr-3 text-success" size="small"></v-icon>
                <span class="font-weight-bold text-subtitle-1">Candidates & Style</span>
                <v-spacer></v-spacer>
                <v-chip color="success" variant="flat" size="small" class="font-weight-bold px-3" v-if="clips.length > 0">
                  {{ clips.length }} Found
                </v-chip>
              </v-card-title>

              <!-- Render Config Panel -->
              <div v-if="clips.length > 0" class="px-6 py-4 border-b border-opacity-10" style="background: rgba(255,255,255,0.02)">
                <v-row dense>
                  <v-col cols="6">
                    <v-select
                      v-model="selectedAspectRatio"
                      :items="aspectRatios"
                      item-title="text"
                      item-value="value"
                      label="Aspect Ratio"
                      variant="outlined"
                      density="compact"
                      hide-details
                      prepend-inner-icon="mdi-crop-free"
                    ></v-select>
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="selectedSubtitleStyle"
                      :items="subtitleStyles"
                      item-title="text"
                      item-value="value"
                      label="Subtitle Style"
                      variant="outlined"
                      density="compact"
                      hide-details
                      prepend-inner-icon="mdi-format-size"
                    ></v-select>
                  </v-col>
                </v-row>
              </div>
              
              <v-card-text class="pa-0 overflow-y-auto flex-grow-1" style="height: calc(580px - 140px);">
                <v-list v-if="clips.length > 0" lines="three" bg-color="transparent" class="pa-0">
                  <v-list-item v-for="(clip, index) in clips" :key="index" class="hover-item px-6 py-4">
                    <template v-slot:prepend>
                      <v-avatar color="rgba(99, 102, 241, 0.15)" size="40" class="mr-4 text-primary font-weight-black border border-primary border-opacity-50">
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
                         Preview
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
                
                <div v-else class="h-100 d-flex flex-column align-center justify-center pa-8 text-center" style="min-height: 400px;">
                  <v-avatar color="rgba(255,255,255,0.05)" size="90" class="mb-6">
                    <v-icon icon="mdi-movie-search-outline" size="50" color="grey-darken-1"></v-icon>
                  </v-avatar>
                  <div class="text-h6 text-grey-lighten-1 font-weight-medium mb-2">No clips generated yet</div>
                  <div class="text-body-2 text-grey">Submit a video link above or select a run from history to load clips.</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Edit Subtitles Dialog -->
    <v-dialog v-model="editSubtitlesDialog" max-width="1200px" scrollable>
      <v-card class="glass-card text-white rounded-xl border border-white border-opacity-10 pa-2" style="background: #0F0F12 !important;">
        <v-card-title class="d-flex align-center py-4 px-6 border-b border-opacity-10 bg-black bg-opacity-20">
          <v-icon icon="mdi-video-vintage" class="mr-3 text-primary"></v-icon>
          <span class="font-weight-bold text-h6">Clipyzee Pro Editor</span>
          <v-chip size="small" color="primary" variant="tonal" class="ml-4 font-weight-bold">
            Clip #{{ (currentEditingClipIndex ?? 0) + 1 }}
          </v-chip>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeEditor"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-6" style="height: 600px; overflow: hidden;">
          <v-row class="h-100">
            <!-- Left Panel: Video Preview -->
            <!-- Left Panel: Video Preview -->
            <v-col cols="12" md="7" class="d-flex flex-column justify-center align-center h-100 bg-black bg-opacity-40 rounded-lg pa-4 relative-content">
              <div class="text-caption text-grey-lighten-2 mb-3 w-100 d-flex justify-space-between align-center" style="position: absolute; top: 12px; left: 16px; right: 16px;">
                <span class="d-flex align-center"><v-icon icon="mdi-eye" class="mr-1" size="small"></v-icon> CROP PREVIEW</span>
                <span class="font-weight-bold text-primary">{{ editorState.aspectRatio }} Mode</span>
              </div>
              <div :style="previewFrameStyle" class="d-flex align-center justify-center bg-black border border-white border-opacity-10" style="position: relative; overflow: hidden;">
                <!-- HTML5 Native Local Video Player -->
                <video
                  v-if="activeClip && activeClip.rawVideoPath"
                  id="editor-video-player"
                  :src="`${API_BASE}/video/download?path=${encodeURIComponent(activeClip.rawVideoPath)}`"
                  controls
                  class="absolute-center"
                  :style="playerWrapperStyle"
                  @timeupdate="onTimeUpdate"
                  @mousedown="onDragStart"
                  style="cursor: grab; max-width: none !important;"
                ></video>
                <div v-else class="w-100 h-100 d-flex align-center justify-center text-grey">
                  No local preview available
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
                        {{ w.text }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </v-col>
            
            <!-- Right Panel: Editor Controls & Style Panel -->
            <v-col cols="12" md="5" class="d-flex flex-column h-100 px-4" style="overflow-y: auto;">
              <!-- Subtitle Style Panel -->
              <div class="mb-4">
                <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-lighten-1 d-flex align-center">
                  <v-icon icon="mdi-palette" class="mr-2" color="primary" size="small"></v-icon> Subtitle Style Presets
                </div>
                
                <v-slide-group v-model="editorState.subtitleStyle" show-arrows mandatory class="mb-3 style-slider">
                  <v-slide-group-item
                    v-for="style in subtitleStyles"
                    :key="style.value"
                    :value="style.value"
                    v-slot="{ isSelected, toggle }"
                  >
                    <v-card
                      :color="isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)'"
                      :class="['ma-1', 'style-preset-card', isSelected ? 'border border-primary border-opacity-70' : 'border border-white border-opacity-5']"
                      width="100"
                      height="70"
                      @click="toggle"
                      flat
                    >
                      <div class="d-flex flex-column align-center justify-center h-100 text-center pa-2">
                        <div :class="['style-preview-text', style.value.toLowerCase()]">
                          TEXT
                        </div>
                        <div class="text-caption font-weight-bold text-white mt-1" style="font-size: 10px !important;">
                          {{ style.text.split(' ')[0] }}
                        </div>
                      </div>
                    </v-card>
                  </v-slide-group-item>
                </v-slide-group>
              </div>

              <!-- Aspect Ratio Selector -->
              <div class="mb-4">
                <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-lighten-1 d-flex align-center">
                  <v-icon icon="mdi-aspect-ratio" class="mr-2" color="warning" size="small"></v-icon> Output Dimension
                </div>
                <v-select
                  v-model="editorState.aspectRatio"
                  :items="aspectRatios"
                  item-title="text"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  bg-color="rgba(255,255,255,0.02)"
                  class="rounded-lg"
                ></v-select>
              </div>

              <!-- Crop Offset Slider -->
              <div v-if="editingSegments.length > 0 && editingSegments[activeSegmentIndex] && editorState.aspectRatio !== '16:9'" class="mb-4">
                <div class="text-subtitle-2 font-weight-bold mb-1 text-grey-lighten-1 d-flex align-center">
                  <v-icon icon="mdi-crop" class="mr-2" color="primary" size="small"></v-icon> Adjust Crop Position (Pan)
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
              
              <!-- Inspector / Editor -->
              <div class="d-flex flex-column flex-grow-1 overflow-hidden">
                <div class="text-subtitle-2 font-weight-bold mb-2 text-grey-lighten-1 d-flex align-center">
                  <v-icon icon="mdi-text-box-edit" class="mr-2" color="info" size="small"></v-icon> Subtitle Editor
                </div>

                <!-- Word Level Styling Inspector -->
                <div v-if="editingSegments.length > 0 && editingSegments[activeSegmentIndex]" class="bg-black bg-opacity-30 rounded-lg pa-3 mb-4 border border-white border-opacity-10">
                  <div class="text-caption font-weight-bold text-grey mb-2 d-flex align-center">
                    <v-icon icon="mdi-palette-swatch" class="mr-1 text-primary" size="small"></v-icon> Word Stylist (Select a word to color)
                  </div>
                  <div class="d-flex flex-wrap gap-1 mb-3">
                    <v-chip
                      v-for="(w, wIdx) in editingSegments[activeSegmentIndex].words"
                      :key="wIdx"
                      :color="selectedWordIndex === wIdx ? 'primary' : 'default'"
                      :variant="selectedWordIndex === wIdx ? 'flat' : 'tonal'"
                      size="small"
                      class="text-caption font-weight-bold px-2 py-1"
                      @click="selectWord(Number(wIdx))"
                      :style="{
                        color: w.textColor || '#fff',
                        textShadow: w.outlineColor ? `1px 1px 0px ${w.outlineColor}` : 'none'
                      }"
                    >
                      {{ w.text }}
                    </v-chip>
                  </div>

                  <!-- Color controls for the active word -->
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
                  </div>

                  <!-- Live Styled Text Preview -->
                  <div class="mt-3 text-center pa-2 rounded bg-black bg-opacity-60 border border-white border-opacity-5 min-h-12 d-flex align-center justify-center">
                    <div class="text-subtitle-2 font-weight-black text-uppercase d-flex flex-wrap justify-center" style="gap: 4px; letter-spacing: 1px;">
                      <span
                        v-for="(w, wIdx) in editingSegments[activeSegmentIndex].words"
                        :key="wIdx"
                        :style="{
                          color: w.textColor || '#FFFFFF',
                          textShadow: w.outlineColor ? `2px 2px 0px ${w.outlineColor}` : '2px 2px 0px #000'
                        }"
                      >
                        {{ w.text }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="flex-grow-1 overflow-y-auto pr-2 pb-2" style="max-height: 200px;">
                  <div v-if="editingSegments.length > 0">
                    <div
                      v-for="(seg, idx) in editingSegments"
                      :key="idx"
                      :class="['mb-3', 'pa-2', 'rounded-lg', 'border', 'transition-all', activeSegmentIndex === idx ? 'border-primary bg-primary bg-opacity-5' : 'border-white border-opacity-5 bg-white bg-opacity-1']"
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
                  <div v-else class="text-center text-grey py-6">
                    No subtitles segments found for this clip range.
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Timeline Track at the Bottom of Dialog -->
        <div class="px-6 py-3 bg-black bg-opacity-40 border-t border-white border-opacity-10">
          <div class="text-caption font-weight-bold mb-2 text-grey d-flex align-center">
            <v-icon icon="mdi-ruler-square" class="mr-2" size="small"></v-icon> VIDEO TIMELINE TRACK
          </div>
          <div class="timeline-track d-flex overflow-x-auto py-2 align-center" style="gap: 8px; min-height: 70px;">
            <div
              v-for="(seg, idx) in editingSegments"
              :key="idx"
              :class="['timeline-block', 'pa-2', 'rounded', 'border', 'transition-all', 'cursor-pointer', activeSegmentIndex === idx ? 'active-block border-primary bg-primary bg-opacity-20' : 'border-white border-opacity-5 bg-white bg-opacity-5']"
              style="min-width: 140px; flex: 1 0 auto;"
              @click="activeSegmentIndex = idx"
            >
              <div class="text-caption text-grey text-truncate font-weight-bold" style="font-size: 10px !important;">
                {{ formatTime(seg.start) }} - {{ formatTime(seg.end) }}
              </div>
              <div class="text-caption text-white text-truncate font-weight-medium mt-0.5">
                {{ seg.text }}
              </div>
            </div>
          </div>
        </div>

        <v-card-actions class="px-6 py-4 border-t border-opacity-10 bg-black bg-opacity-60">
          <v-spacer></v-spacer>
          <v-btn variant="outlined" color="white" class="mr-3" @click="closeEditor">Close Editor</v-btn>
          <v-btn color="success" variant="flat" class="px-8 py-2 text-button font-weight-bold rounded-lg elevation-4 gradient-btn" @click="renderFromEditor">
            <v-icon icon="mdi-movie-open" class="mr-2"></v-icon> Render HD Clip
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Extraction Overlay -->
    <v-overlay v-model="isExtractingVideo" class="align-center justify-center" persistent scrim="#000" opacity="0.8">
      <div class="text-center pa-6 rounded-lg bg-black bg-opacity-80 border border-white border-opacity-10 text-white" style="max-width: 320px; z-index: 10000;">
        <v-progress-circular indeterminate color="primary" size="64" class="mb-4"></v-progress-circular>
        <div class="text-subtitle-1 font-weight-bold mb-1">Preparing Raw Clip</div>
        <div class="text-caption text-grey">{{ extractionProgress }}</div>
      </div>
    </v-overlay>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'

const API_BASE = 'http://localhost:3000'

interface ClipCandidate {
  start: number;
  end: number;
  reason: string;
  score: number;
  isDownloading?: boolean;
  isEdited?: boolean;
  customTranscript?: any[];
  aspectRatio?: string;
  subtitleStyle?: string;
  cropX?: number;
  rawVideoPath?: string;
}

const videoUrl = ref('')
const currentVideoId = ref('')
const isProcessing = ref(false)
const logs = ref<string>('System initialized. Awaiting user input...\n')
const clips = ref<ClipCandidate[]>([])

// History & Render States
const isFetchingHistory = ref(false)
const history = ref<any[]>([])
const selectedAspectRatio = ref('9:16')
const selectedSubtitleStyle = ref('DEFAULT')

// Subtitle Editing States
const fullTranscript = ref<any[]>([])
const editSubtitlesDialog = ref(false)
const editingSegments = ref<any[]>([])
const currentEditingClipIndex = ref<number | null>(null)

const editorState = ref({
  aspectRatio: '9:16',
  subtitleStyle: 'DEFAULT',
  cropX: 50
})

const isExtractingVideo = ref(false)
const extractionProgress = ref('')

const isDragging = ref(false)
let dragStartX = 0
let dragStartCropX = 50

const onDragStart = (e: MouseEvent) => {
  if (editorState.value.aspectRatio === '16:9') return
  const activeSeg = editingSegments.value[activeSegmentIndex.value]
  if (!activeSeg) return
  
  isDragging.value = true
  dragStartX = e.clientX
  dragStartCropX = activeSeg.cropX !== undefined ? activeSeg.cropX : 50
  
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

const onDragMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const activeSeg = editingSegments.value[activeSegmentIndex.value]
  if (!activeSeg) return
  
  const ratio = editorState.value.aspectRatio
  let containerWidth = 260
  let height = 462
  
  if (ratio === '1:1') {
    containerWidth = 360
    height = 360
  } else if (ratio === '4:3') {
    containerWidth = 480
    height = 360
  }
  
  const iframeWidth = height * 16 / 9
  const maxOffset = iframeWidth - containerWidth
  
  const deltaX = e.clientX - dragStartX
  let newCropX = dragStartCropX - (deltaX / maxOffset) * 100
  newCropX = Math.max(0, Math.min(100, Math.round(newCropX)))
  
  activeSeg.cropX = newCropX
  editorState.value.cropX = newCropX
}

const onDragEnd = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

const onTimeUpdate = (e: Event) => {
  const video = e.target as HTMLVideoElement
  const startSec = clips.value[currentEditingClipIndex.value!]?.start || 0
  playerCurrentTime.value = startSec + video.currentTime
}

const selectSegment = (idx: number) => {
  activeSegmentIndex.value = idx
  selectedWordIndex.value = null
  
  const video = document.getElementById('editor-video-player') as HTMLVideoElement
  const clip = clips.value[currentEditingClipIndex.value!]
  if (video && clip && editingSegments.value[idx]) {
    const targetTime = editingSegments.value[idx].start
    const relativeTime = Math.max(0, targetTime - clip.start)
    video.currentTime = relativeTime
  }
}

const selectWord = (wIdx: number) => {
  selectedWordIndex.value = wIdx
  
  const video = document.getElementById('editor-video-player') as HTMLVideoElement
  const clip = clips.value[currentEditingClipIndex.value!]
  const activeSeg = editingSegments.value[activeSegmentIndex.value]
  if (video && clip && activeSeg && activeSeg.words && activeSeg.words[wIdx]) {
    const targetTime = activeSeg.words[wIdx].start
    const relativeTime = Math.max(0, targetTime - clip.start)
    video.currentTime = relativeTime
  }
}

const activeSegmentIndex = ref(0)
const selectedWordIndex = ref<number | null>(null)

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
  { name: 'White', value: '#FFFFFF' },
  { name: 'Indigo', value: '#82004B' },
  { name: 'Dark Grey', value: '#222222' },
  { name: 'None', value: '' }
]

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

const playerCurrentTime = ref(0)

const closeEditor = () => {
  editSubtitlesDialog.value = false
}

const activeSegment = computed(() => {
  const t = playerCurrentTime.value
  return editingSegments.value.find(seg => t >= seg.start && t <= seg.end)
})

// Watch active segment to dynamically pan the preview window during playback
watch(activeSegment, (newSeg) => {
  if (newSeg) {
    editorState.value.cropX = newSeg.cropX !== undefined ? newSeg.cropX : 50
  }
})

// Also watch activeSegmentIndex (clicking segment in inspector or timeline) to update slider/panning
watch(activeSegmentIndex, (newIdx) => {
  const seg = editingSegments.value[newIdx]
  if (seg) {
    editorState.value.cropX = seg.cropX !== undefined ? seg.cropX : 50
  }
})

const activeSubtitleWords = computed(() => {
  const seg = activeSegment.value
  if (!seg) return []
  const words = getSegmentWords(seg)
  // Read properties to register reactive dependencies in this computed context
  words.forEach((w: any) => {
    if (w.textColor !== undefined || w.outlineColor !== undefined) {
      // touch properties for reactivity tracking
    }
  })
  return words
})

const isWordActiveSpoken = (w: any) => {
  const t = playerCurrentTime.value
  return t >= w.start && t <= w.end
}

const getWordPreviewStyle = (w: any) => {
  const isActive = isWordActiveSpoken(w)
  
  const styleName = editorState.value.subtitleStyle || 'DEFAULT'
  const activeColors: Record<string, string> = {
    DEFAULT: '#FFFF00',
    CYBERPUNK: '#00FF00',
    CUTE: '#FF00FF',
    MINIMALIST: '#FFFF00'
  }
  const defaultInactiveColors: Record<string, string> = {
    DEFAULT: '#FFFFFF',
    CYBERPUNK: '#FFFFFF',
    CUTE: '#FFFFFF',
    MINIMALIST: '#F0F0F0'
  }
  
  const primaryColor = isActive 
    ? activeColors[styleName] 
    : (w.textColor || defaultInactiveColors[styleName])
    
  const outlineColor = w.outlineColor || '#000000'
  
  const fontStyle: Record<string, any> = {
    DEFAULT: { fontFamily: "'Arial Black', sans-serif", fontSize: '24px' },
    CYBERPUNK: { fontFamily: "'Impact', sans-serif", fontSize: '28px' },
    CUTE: { fontFamily: "'Comic Sans MS', sans-serif", fontSize: '22px' },
    MINIMALIST: { fontFamily: "'Arial', sans-serif", fontSize: '20px' }
  }
  
  const selectedFont = fontStyle[styleName] || fontStyle.DEFAULT
  
  return {
    color: primaryColor,
    fontFamily: selectedFont.fontFamily,
    fontSize: selectedFont.fontSize,
    textShadow: outlineColor ? `2px 2px 0px ${outlineColor}, -2px -2px 0px ${outlineColor}, 2px -2px 0px ${outlineColor}, -2px 2px 0px ${outlineColor}` : 'none',
    marginRight: '6px',
    display: 'inline-block',
    transition: 'color 0.1s ease',
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
    const iframeWidth = height * 16 / 9; // 821.33
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
    const iframeWidth = height * 16 / 9; // 640
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
    const iframeWidth = height * 16 / 9; // 640
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
  } else { // 16:9
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
      height: '462px', // 9:16 aspect ratio scaled
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
  } else { // 16:9
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

const activeClip = computed(() => {
  if (currentEditingClipIndex.value === null) return null
  return clips.value[currentEditingClipIndex.value] || null
})

const aspectRatios = [
  { text: 'Vertical (9:16)', value: '9:16' },
  { text: 'Standard (4:3)', value: '4:3' },
  { text: 'Square (1:1)', value: '1:1' },
  { text: 'Horizontal (16:9)', value: '16:9' }
]

const subtitleStyles = [
  { text: 'Default (Yellow)', value: 'DEFAULT' },
  { text: 'Cyberpunk (Green)', value: 'CYBERPUNK' },
  { text: 'Cute (Pink)', value: 'CUTE' },
  { text: 'Minimalist (Cyan)', value: 'MINIMALIST' }
]

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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

const appendLog = (message: string) => {
  const timeInfo = new Date().toLocaleTimeString()
  logs.value += `[${timeInfo}] ${message}\n`
}

const fetchHistory = async () => {
  isFetchingHistory.value = true
  try {
    const res = await fetch(`${API_BASE}/video/history`)
    if (!res.ok) throw new Error('Failed to fetch history')
    history.value = await res.json()
  } catch (err: any) {
    appendLog(`[ERROR] Failed to fetch history: ${err.message}`)
  } finally {
    isFetchingHistory.value = false
  }
}

const loadHistoryItem = (item: any) => {
  currentVideoId.value = item.id
  videoUrl.value = item.sourceUrl
  
  // Find the completed ANALYZE job
  const analyzeJob = item.jobs?.find((j: any) => j.type === 'ANALYZE' && j.status === 'COMPLETED')
  if (analyzeJob && analyzeJob.result?.clips) {
    clips.value = analyzeJob.result.clips
    fullTranscript.value = analyzeJob.result.transcript || []
    appendLog(`[LOAD] Loaded ${clips.value.length} clips from history for video: ${item.title || item.sourceUrl}`)
  } else {
    clips.value = []
    fullTranscript.value = []
    appendLog(`[LOAD] Selected video has no completed clips.`)
  }
}

onMounted(() => {
  fetchHistory()
  
  if (!(window as any).YT) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    } else {
      document.head.appendChild(tag)
    }
  }
})

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
        fullTranscript.value = data.result?.transcript || []
        isProcessing.value = false
        fetchHistory()
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

// Subtitle Editing Actions
const openEditor = async (clip: ClipCandidate, index: number) => {
  currentEditingClipIndex.value = index
  activeSegmentIndex.value = 0
  selectedWordIndex.value = null
  
  if (!clip.rawVideoPath) {
    isExtractingVideo.value = true
    extractionProgress.value = 'Queuing raw clip extraction...'
    try {
      const res = await fetch(`${API_BASE}/video/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: currentVideoId.value,
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
  
  editingSegments.value = segments.map((seg: any) => {
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
  
  editorState.value = {
    aspectRatio: clip.aspectRatio || selectedAspectRatio.value,
    subtitleStyle: clip.subtitleStyle || selectedSubtitleStyle.value,
    cropX: clip.cropX !== undefined ? clip.cropX : 50
  }
  
  editSubtitlesDialog.value = true
}

const pollExtractJob = (jobId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/video/job/${jobId}`)
        const data = await res.json()
        if (data.status === 'COMPLETED') {
          clearInterval(checkInterval)
          resolve(data.result.filePath)
        } else if (data.status === 'FAILED') {
          clearInterval(checkInterval)
          reject(new Error('Worker failed to extract raw segment.'))
        }
      } catch (e) {
        clearInterval(checkInterval)
        reject(e)
      }
    }, 2000)
  })
}

const renderFromEditor = () => {
  const index = currentEditingClipIndex.value
  if (index !== null && index >= 0 && index < clips.value.length) {
    const clip = clips.value[index]
    if (clip) {
      clip.customTranscript = editingSegments.value
      clip.aspectRatio = editorState.value.aspectRatio
      clip.subtitleStyle = editorState.value.subtitleStyle
      clip.cropX = editorState.value.cropX
      clip.isEdited = true
      appendLog(`[EDITOR] Saved clip #${index + 1} configuration`)
      editSubtitlesDialog.value = false
      downloadClip(clip)
    }
  }
}

const downloadClip = async (clip: ClipCandidate) => {
   try {
     const ratio = clip.aspectRatio || selectedAspectRatio.value
     const style = clip.subtitleStyle || selectedSubtitleStyle.value
     
     clip.isDownloading = true
     appendLog(`[RENDER] Dispatching Phase 2 Render Job for limits [${formatTime(clip.start)} - ${formatTime(clip.end)}] (Aspect: ${ratio}, Style: ${style})`)
     
     const res = await fetch(`${API_BASE}/video/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           videoId: currentVideoId.value,
           url: videoUrl.value,
           start: clip.start,
           end: clip.end,
           aspectRatio: ratio,
           subtitleStyle: style,
           customTranscript: clip.customTranscript || null,
           cropX: clip.cropX !== undefined ? clip.cropX : 50,
           rawVideoPath: clip.rawVideoPath || null
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

.style-preset-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border-radius: 8px !important;
}
.style-preset-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08) !important;
}
.style-preview-text {
  font-size: 12px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
}
.style-preview-text.default {
  color: #FFFF00; /* Yellow */
  font-family: 'Arial Black', sans-serif;
  text-shadow: 2px 2px 0px #000;
  background: #222;
}
.style-preview-text.cyberpunk {
  color: #00FF00; /* Neon Green */
  font-family: 'Impact', sans-serif;
  text-shadow: 2px 2px 0px #000;
  background: #111;
}
.style-preview-text.cute {
  color: #FF00FF; /* Pink */
  font-family: 'Comic Sans MS', sans-serif;
  text-shadow: 1px 1px 0px #82004B;
  background: #fff;
}
.style-preview-text.minimalist {
  color: #00FFFF; /* Cyan */
  font-family: 'Arial', sans-serif;
  background: rgba(0,0,0,0.8);
  border: 1px solid #00FFFF;
}
.timeline-track::-webkit-scrollbar {
  height: 6px;
}
.timeline-track::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.timeline-track::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 3px;
}
.timeline-track::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
.timeline-block {
  border-left: 4px solid #6366F1 !important;
}
.timeline-block.active-block {
  border-left: 4px solid #EC4899 !important;
}
</style>
