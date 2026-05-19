import { getApiUrl } from '@/utils/api-config'

type AnalyticsEvent = 'card_click' | 'promo_copy'

const LS_PREFIX = 'cd_tracked_copy_'

function getTodayKey(slug: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `${LS_PREFIX}${slug}_${today}`
}

function isAlreadyTrackedToday(slug: string): boolean {
  try {
    return localStorage.getItem(getTodayKey(slug)) === '1'
  } catch {
    return false
  }
}

function markTrackedToday(slug: string): void {
  try {
    localStorage.setItem(getTodayKey(slug), '1')
  } catch {
    // localStorage недоступен — не блокируем работу
  }
}

export function useAnalytics() {
  function track(event: AnalyticsEvent, slug: string): void {
    void fetch(getApiUrl('/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, slug }),
    }).catch(() => {
      // fire-and-forget
    })
  }

  function trackCardClick(slug: string): void {
    track('card_click', slug)
  }

  function trackPromoCopy(slug: string): void {
    if (isAlreadyTrackedToday(slug)) return
    markTrackedToday(slug)
    track('promo_copy', slug)
  }

  return {
    trackCardClick,
    trackPromoCopy,
  }
}
