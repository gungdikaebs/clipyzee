import { ref, computed } from 'vue'
import type { ClipCandidate } from '../types'

const API_BASE = 'http://localhost:3000'

// Declared outside useWorkspace so it acts as a global singleton state!
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
const currentEditingClipIndex = ref<number | null>(null)
const editorSegments = ref<any[]>([])

const isExtractingVideo = ref(false)
const extractionProgress = ref('')

const activeClip = computed(() => {
  if (currentEditingClipIndex.value === null) return null
  return clips.value[currentEditingClipIndex.value] || null
})

const appendLog = (msg: string) => {
  const time = new Date().toLocaleTimeString()
  logs.value += `[${time}] ${msg}\n`
}

const fetchHistory = async () => {
  isFetchingHistory.value = true
  try {
    const res = await fetch(`${API_BASE}/video/history`)
    const data = await res.json()
    history.value = data
  } catch (err: any) {
    appendLog(`[ERROR] Failed to fetch history: ${err.message}`)
  } finally {
    isFetchingHistory.value = false
  }
}

const loadHistoryItem = (item: any) => {
  const analyzeJob = item.jobs?.find((j: any) => j.type === 'ANALYZE' && j.status === 'COMPLETED')
  if (analyzeJob) {
    clips.value = analyzeJob.result.clips || []
    fullTranscript.value = analyzeJob.result.transcript || []
    videoUrl.value = item.sourceUrl
    currentVideoId.value = item.id
    appendLog(`[HISTORY] Loaded active workspace for video: ${item.title || item.sourceUrl}`)
    return true
  } else {
    appendLog(`[WARN] Analysis job not finished or failed for this creation record.`)
    return false
  }
}

const openPreview = (clip: ClipCandidate) => {
  const startSec = Math.floor(clip.start)
  const joiner = videoUrl.value.includes('?') ? '&' : '?'
  window.open(`${videoUrl.value}${joiner}t=${startSec}s`, '_blank')
}

const pollAnalysisJob = async (jobId: string, onComplete: () => void, onError: () => void) => {
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
        onComplete()
      } else if (data.status === 'FAILED') {
        clearInterval(checkInterval)
        appendLog(`[FAILED] Transcription or analysis crashed on worker node.`)
        isProcessing.value = false
        onError()
      } else {
        appendLog(`Worker status: [${data.status}]...`)
      }
    } catch (e) {
      console.error(e)
    }
  }, 4000)
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

const pollRenderJob = (jobId: string, clip: ClipCandidate) => {
   const checkInterval = setInterval(async () => {
      try {
         const res = await fetch(`${API_BASE}/video/job/${jobId}`)
         const data = await res.json()
         
         if (data.status === 'COMPLETED') {
            clearInterval(checkInterval)
            clip.isDownloading = false
            appendLog(`[RENDER DONE] Fast yt-dlp snippet downloaded! Fetching file...`)
            window.location.href = `${API_BASE}/video/download?path=${encodeURIComponent(data.result.filePath)}&download=true`
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

const saveWorkspaceState = async () => {
  if (!currentVideoId.value || clips.value.length === 0) return;
  try {
    const res = await fetch(`${API_BASE}/video/update-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: currentVideoId.value,
        clips: clips.value
      })
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    appendLog(`[WORKSPACE] Workspace state successfully synchronized to database.`);
  } catch (e: any) {
    console.error('Failed to sync workspace state to DB:', e);
    appendLog(`[ERROR] Failed to save workspace state: ${e.message}`);
  }
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function useWorkspace() {
  return {
    API_BASE,
    videoUrl,
    currentVideoId,
    isProcessing,
    logs,
    clips,
    isFetchingHistory,
    history,
    selectedAspectRatio,
    selectedSubtitleStyle,
    fullTranscript,
    currentEditingClipIndex,
    editorSegments,
    isExtractingVideo,
    extractionProgress,
    activeClip,
    appendLog,
    fetchHistory,
    loadHistoryItem,
    pollAnalysisJob,
    pollExtractJob,
    downloadClip,
    openPreview,
    saveWorkspaceState
  }
}
