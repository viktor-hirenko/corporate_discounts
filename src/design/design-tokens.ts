import type { CSSVarName } from './design-tokens.d'

/**
 * Helper function to set CSS custom properties safely
 */
export const setCSSVar = (el: HTMLElement, name: CSSVarName, value: string): void => {
  el.style.setProperty(name, value)
}
