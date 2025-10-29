/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.0 formula
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Determine if white or black text should be used on a given background color
 * Returns 'white' or 'black'
 */
export function getContrastColor(backgroundColor: string): 'white' | 'black' {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return 'black'; // Default to black if parsing fails
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  
  // WCAG recommends 0.179 as threshold
  // If luminance > 0.179, use black text, otherwise white
  return luminance > 0.179 ? 'black' : 'white';
}

/**
 * Get bot avatar colors based on branding settings
 */
export function getBotAvatarColors(primaryColor: string = '#59B4E2') {
  const contrastColor = getContrastColor(primaryColor);
  
  return {
    backgroundColor: primaryColor,
    iconColor: contrastColor,
  };
}
