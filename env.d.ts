/// <reference types="vite/client" />

declare module '*.json' {
  const value: any
  export default value
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Google Identity Services типы
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            config: {
              type: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: string
              locale?: string
            },
          ) => void
          prompt: (
            callback?: (notification: {
              isNotDisplayed: boolean
              isSkippedMoment: boolean
              isDismissedMoment: boolean
            }) => void,
          ) => void
        }
      }
    }
  }
}

export {}
