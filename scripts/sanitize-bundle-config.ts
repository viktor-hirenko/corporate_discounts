/**
 * Removes sensitive fields from the embedded src/data/app-config.json before
 * it gets baked into the Vite bundle. The runtime fallback in the frontend
 * imports this file when the worker API is unreachable, so anything kept here
 * is effectively public. This script keeps only what the public catalogue UI
 * actually needs.
 *
 * Stripped fields:
 *   - allowedUsers          (admin/editor allowlist — moved to R2 admin-allowlist.json)
 *   - partners[*]           with isHidden === true (hidden by content managers)
 *
 * Run via:  tsx scripts/sanitize-bundle-config.ts
 * Hooked into:  predev, prebuild
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_PATH = path.resolve(__dirname, '../src/data/app-config.json')

function sanitize(): void {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.warn(`[sanitize-bundle-config] Config not found: ${CONFIG_PATH}`)
    return
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  let config: Record<string, unknown>
  try {
    config = JSON.parse(raw) as Record<string, unknown>
  } catch (error) {
    console.error('[sanitize-bundle-config] Failed to parse config:', error)
    process.exit(1)
  }

  let removedUsers = 0
  let removedPartners = 0

  if ('allowedUsers' in config) {
    const list = config.allowedUsers
    if (Array.isArray(list)) removedUsers = list.length
    delete config.allowedUsers
  }

  if (config.partners && typeof config.partners === 'object') {
    const partners = config.partners as Record<string, Record<string, unknown>>
    const visible: Record<string, Record<string, unknown>> = {}
    for (const [slug, partner] of Object.entries(partners)) {
      if (partner && partner.isHidden === true) {
        removedPartners++
        continue
      }
      visible[slug] = partner
    }
    config.partners = visible
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  console.log(
    `[sanitize-bundle-config] Cleaned ${CONFIG_PATH}: ` +
      `removed ${removedUsers} user(s), ${removedPartners} hidden partner(s)`,
  )
}

sanitize()
