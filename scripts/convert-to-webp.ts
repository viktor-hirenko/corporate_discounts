#!/usr/bin/env tsx

import { readdir, stat } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import sharp from 'sharp'

// Configuration
const IMAGES_DIR = 'src/assets/images/partners'
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg']
const TARGET_SIZE = 384 // 384x384 pixels
const WEBP_QUALITY = 85

async function convertToWebP() {
  console.log('🖼️  Converting partner images to WebP (384x384)...')
  console.log(`📁 Directory: ${IMAGES_DIR}`)

  try {
    const files = await readdir(IMAGES_DIR)
    let convertedCount = 0
    let skippedCount = 0

    for (const file of files) {
      const filePath = join(IMAGES_DIR, file)
      const fileStat = await stat(filePath)

      if (!fileStat.isFile()) continue

      const ext = extname(file).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue

      // Skip already converted WebP files
      if (ext === '.webp') {
        skippedCount++
        continue
      }

      const nameWithoutExt = basename(file, ext)
      const webpPath = join(dirname(filePath), `${nameWithoutExt}.webp`)

      try {
        // Resize to 384x384 with 'contain' to maintain aspect ratio
        // and convert to WebP
        await sharp(filePath)
          .resize(TARGET_SIZE, TARGET_SIZE, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background for transparency
          })
          .webp({ quality: WEBP_QUALITY, effort: 4 })
          .toFile(webpPath)

        console.log(
          `✅ Converted: ${file} → ${nameWithoutExt}.webp (${TARGET_SIZE}x${TARGET_SIZE})`,
        )

        convertedCount++
      } catch (error) {
        console.error(`❌ Failed to convert ${file}:`, error)
      }
    }

    console.log(`\n🎉 Conversion complete!`)
    console.log(`   ✅ Converted: ${convertedCount} images`)
    if (skippedCount > 0) {
      console.log(`   ⏭️  Skipped: ${skippedCount} files`)
    }
  } catch (error) {
    console.error('❌ Error reading images directory:', error)
    process.exit(1)
  }
}

convertToWebP()
