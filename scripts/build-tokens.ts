#!/usr/bin/env node

/**
 * Design tokens build script.
 * Generates CSS variables and TypeScript types from tokens.json.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface DesignTokens {
  [category: string]: {
    [token: string]: string
  }
}

interface ThemeTokens {
  [theme: string]: DesignTokens
}

interface TokensConfig {
  themes?: ThemeTokens
  [category: string]: unknown
}

/**
 * Builds design tokens from JSON configuration.
 * Generates CSS variables and TypeScript type definitions.
 */
async function buildTokens() {
  console.log('🎨 Building design tokens...')

  // Читаємо токени з конфігурації
  const tokensPath = join(process.cwd(), 'src/design/tokens.json')
  const config: TokensConfig = JSON.parse(readFileSync(tokensPath, 'utf-8'))

  // Витягуємо базові токени (без тем)
  const { themes, ...baseTokens } = config
  const tokens: DesignTokens = baseTokens

  // Створюємо папку design якщо не існує
  const designDir = join(process.cwd(), 'src/design')
  try {
    const { mkdirSync } = await import('fs')
    mkdirSync(designDir, { recursive: true })
  } catch {
    // Папка вже існує
  }

  // Генеруємо CSS змінні
  generateCSS(tokens, themes)

  // Генеруємо TypeScript типи
  generateTypes(tokens)

  console.log('✅ Design tokens built successfully!')
}

/**
 * Generates CSS variables from design tokens.
 * @param tokens - Base design tokens
 * @param themes - Optional theme configurations
 */
function generateCSS(tokens: DesignTokens, themes?: ThemeTokens) {
  const cssPath = join(process.cwd(), 'src/design/tokens.css')

  let css = `/* Auto-generated design tokens - DO NOT EDIT */
/* Generated from src/design/tokens.json */

:root {
`

  // Генеруємо CSS змінні для всіх категорій
  Object.entries(tokens).forEach(([category, categoryTokens]) => {
    Object.entries(categoryTokens).forEach(([token, value]) => {
      // Пропускаємо тільки службові ключі
      if (token.startsWith('_comment')) {
        return
      }

      const cssVarName = `--${category}-${token}`
      css += `  ${cssVarName}: ${value};\n`
    })
  })

  css += `}
`

  // Генеруємо теми якщо вони є
  if (themes) {
    Object.entries(themes).forEach(([themeName, themeTokens]) => {
      css += `
/* ${themeName} theme */
[data-theme="${themeName}"] {
`
      Object.entries(themeTokens).forEach(([category, categoryTokens]) => {
        Object.entries(categoryTokens).forEach(([token, value]) => {
          // Пропускаємо тільки службові ключі
          if (token.startsWith('_comment')) {
            return
          }

          const cssVarName = `--${category}-${token}`
          css += `  ${cssVarName}: ${value};\n`
        })
      })
      css += `}
`
    })
  }

  css += `
/* Theme-specific overrides */
/* Add custom theme overrides here if needed */
`

  writeFileSync(cssPath, css)
  console.log('📄 Generated src/design/tokens.css')
}

/**
 * Generates TypeScript type definitions from design tokens.
 * @param tokens - Design tokens to generate types for
 */
function generateTypes(tokens: DesignTokens) {
  const typesPath = join(process.cwd(), 'src/design/design-tokens.d.ts')

  // Збираємо всі можливі ключі токенів з усіх категорій
  const tokenKeys: string[] = []
  Object.entries(tokens).forEach(([category, categoryTokens]) => {
    Object.keys(categoryTokens).forEach((token) => {
      // Пропускаємо тільки службові ключі
      if (token.startsWith('_comment')) {
        return
      }

      tokenKeys.push(`${category}-${token}`)
    })
  })

  const typesContent = `/* Auto-generated design token types - DO NOT EDIT */
/* Generated from src/design/tokens.json */

export type DesignTokenKey = ${tokenKeys.map((key) => `"${key}"`).join(' | ')};

export type CSSVarName = \`--\${DesignTokenKey}\`;

export interface DesignTokens {
${Object.entries(tokens)
  .map(([category, categoryTokens]) => {
    return `  ${category}: {
${Object.keys(categoryTokens)
  .filter((token) => !token.startsWith('_comment'))
  .map((token) => {
    // Оборачиваем ключи с дефисами в кавычки
    const quotedKey = token.includes('-') ? `"${token}"` : token
    return `    ${quotedKey}: string;`
  })
  .join('\n')}
  };`
  })
  .join('\n')}
}

/**
 * Helper function to set CSS custom properties safely
 * Note: This function is implemented in design-tokens.ts, not in this .d.ts file
 */
export declare const setCSSVar: (el: HTMLElement, name: CSSVarName, value: string) => void;
`

  writeFileSync(typesPath, typesContent)
  console.log('📝 Generated src/design/design-tokens.d.ts')
}

// Запускаємо збірку
buildTokens().catch(console.error)

export { buildTokens }
