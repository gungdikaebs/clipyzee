import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'dark',
        themes: {
            dark: {
                dark: true,
                colors: {
                    background: '#0B0F19', // Deep dark blue
                    surface: '#111827', // Sleek dark gray
                    primary: '#6366F1', // Indigo
                    secondary: '#EC4899', // Pink
                    success: '#10B981', // Emerald
                    warning: '#F59E0B',
                    error: '#EF4444',
                    info: '#3B82F6',
                }
            }
        }
    },
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
})
