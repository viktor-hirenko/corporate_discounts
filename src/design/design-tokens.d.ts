/* Auto-generated design token types - DO NOT EDIT */
/* Generated from src/design/tokens.json */

export type DesignTokenKey = "color-primary-100" | "color-primary-200" | "color-primary-250" | "color-primary-300" | "color-primary-400" | "color-primary-500" | "color-primary-600" | "color-secondary-100" | "color-secondary-150" | "color-secondary-200" | "color-secondary-300" | "color-secondary-400" | "color-secondary-500" | "color-secondary-600" | "color-neutral-100" | "color-neutral-200" | "color-neutral-300" | "color-neutral-400" | "color-neutral-500" | "color-neutral-600" | "color-neutral-700" | "color-semantic-error" | "color-semantic-warning" | "color-semantic-success" | "color-accent-lemon" | "color-accent-yellow" | "color-accent-green" | "color-accent-pink" | "color-accent-blue" | "color-accent-dark-blue" | "color-accent-gray" | "gradient-hero-surface" | "gradient-card-highlight" | "gradient-button-primary" | "gradient-button-secondary";

export type CSSVarName = `--${DesignTokenKey}`;

export interface DesignTokens {
  color: {
    "primary-100": string;
    "primary-200": string;
    "primary-250": string;
    "primary-300": string;
    "primary-400": string;
    "primary-500": string;
    "primary-600": string;
    "secondary-100": string;
    "secondary-150": string;
    "secondary-200": string;
    "secondary-300": string;
    "secondary-400": string;
    "secondary-500": string;
    "secondary-600": string;
    "neutral-100": string;
    "neutral-200": string;
    "neutral-300": string;
    "neutral-400": string;
    "neutral-500": string;
    "neutral-600": string;
    "neutral-700": string;
    "semantic-error": string;
    "semantic-warning": string;
    "semantic-success": string;
    "accent-lemon": string;
    "accent-yellow": string;
    "accent-green": string;
    "accent-pink": string;
    "accent-blue": string;
    "accent-dark-blue": string;
    "accent-gray": string;
  };
  gradient: {
    "hero-surface": string;
    "card-highlight": string;
    "button-primary": string;
    "button-secondary": string;
  };
}

/**
 * Helper function to set CSS custom properties safely
 * Note: This function is implemented in design-tokens.ts, not in this .d.ts file
 */
export declare const setCSSVar: (el: HTMLElement, name: CSSVarName, value: string) => void;
