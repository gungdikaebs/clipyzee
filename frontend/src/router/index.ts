import { createRouter, createWebHistory } from 'vue-router'
import ExploreDashboard from '../views/ExploreDashboard.vue'
import MyCreations from '../views/MyCreations.vue'
import StudioWorkspace from '../views/StudioWorkspace.vue'
import VideoEditor from '../views/VideoEditor.vue'

const routes = [
  { path: '/', redirect: '/explore' },
  { path: '/explore', name: 'Explore', component: ExploreDashboard },
  { path: '/my-creations', name: 'MyCreations', component: MyCreations },
  { path: '/studio/:step(import|analyze|candidates)/:id?', name: 'Studio', component: StudioWorkspace, props: true },
  { path: '/studio/editor/:videoId/:clipIndex', name: 'Editor', component: VideoEditor, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
