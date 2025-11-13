#!/usr/bin/env tsx

import { readdir, stat } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import sharp from 'sharp'

// const IMAGES_DIR = 'src/assets/images'
const IMAGES_DIR = 'public/images'
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg']

async function convertToWebP() {
  console.log('🖼️  Converting images to WebP...')

  try {
    const files = await readdir(IMAGES_DIR)
    let convertedCount = 0

    for (const file of files) {
      const filePath = join(IMAGES_DIR, file)
      const fileStat = await stat(filePath)

      if (!fileStat.isFile()) continue

      const ext = extname(file).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue

      const nameWithoutExt = basename(file, ext)
      const webpPath = join(dirname(filePath), `${nameWithoutExt}.webp`)

      try {
        await sharp(filePath).webp({ quality: 85, effort: 4 }).toFile(webpPath)

        console.log(`✅ Converted: ${file} → ${nameWithoutExt}.webp`)
        convertedCount++
      } catch (error) {
        console.error(`❌ Failed to convert ${file}:`, error)
      }
    }

    console.log(`🎉 Conversion complete! Converted ${convertedCount} images to WebP.`)
  } catch (error) {
    console.error('❌ Error reading images directory:', error)
    process.exit(1)
  }
}

convertToWebP()
