/**
 * RKS Chatbot Design System
 * Zentralisierte Design-Tokens für konsistentes UI/UX
 */

// ============================================================================
// SPACING SYSTEM (8px Grid)
// ============================================================================
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '1rem',      // 16px
  md: '1.5rem',    // 24px
  lg: '2rem',      // 32px
  xl: '3rem',      // 48px
  '2xl': '4rem',   // 64px
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================
export const typography = {
  // Display (für Hero-Texte)
  display: {
    fontSize: 'text-4xl sm:text-5xl',
    fontWeight: 'font-bold',
    lineHeight: 'leading-tight',
  },
  
  // Headings
  h1: {
    fontSize: 'text-2xl sm:text-3xl',
    fontWeight: 'font-bold',
    lineHeight: 'leading-tight',
  },
  h2: {
    fontSize: 'text-xl sm:text-2xl',
    fontWeight: 'font-bold',
    lineHeight: 'leading-snug',
  },
  h3: {
    fontSize: 'text-lg sm:text-xl',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-snug',
  },
  h4: {
    fontSize: 'text-base sm:text-lg',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-normal',
  },
  
  // Body Text
  body: {
    fontSize: 'text-base',
    fontWeight: 'font-normal',
    lineHeight: 'leading-relaxed',
  },
  bodySmall: {
    fontSize: 'text-sm',
    fontWeight: 'font-normal',
    lineHeight: 'leading-relaxed',
  },
  
  // Labels & Captions
  label: {
    fontSize: 'text-sm',
    fontWeight: 'font-medium',
    lineHeight: 'leading-normal',
  },
  caption: {
    fontSize: 'text-xs',
    fontWeight: 'font-normal',
    lineHeight: 'leading-normal',
  },
  
  // Button Text
  button: {
    fontSize: 'text-base',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-none',
  },
  buttonSmall: {
    fontSize: 'text-sm',
    fontWeight: 'font-semibold',
    lineHeight: 'leading-none',
  },
} as const;

// ============================================================================
// COLOR SYSTEM
// ============================================================================
export const colors = {
  // Brand Colors
  primary: {
    main: '#59B4E2',
    light: '#7AC5EA',
    dark: '#409CCA',
    lighter: 'color-mix(in srgb, #59B4E2 10%, white)',
  },
  secondary: {
    main: '#62B04A',
    light: '#7BC263',
    dark: '#4A8A37',
    lighter: 'color-mix(in srgb, #62B04A 10%, white)',
  },
  
  // Semantic Colors
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  
  // Neutral Colors
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// ============================================================================
// BUTTON VARIANTS
// ============================================================================
export const buttonVariants = {
  // Primary Button (Hauptaktionen)
  primary: {
    base: 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold shadow-lg shadow-[var(--primary-color)]/20',
    hover: 'hover:shadow-xl hover:shadow-[var(--primary-color)]/30',
    active: 'active:scale-[0.98]',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    full: 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold shadow-lg shadow-[var(--primary-color)]/20 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300',
  },
  
  // Secondary Button (Sekundäre Aktionen)
  secondary: {
    base: 'bg-white text-gray-900 font-semibold border-2 border-gray-200 shadow-sm',
    hover: 'hover:bg-gray-50 hover:border-gray-300',
    active: 'active:scale-[0.98]',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    full: 'bg-white text-gray-900 font-semibold border-2 border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300',
  },
  
  // Outline Button (Tertiäre Aktionen)
  outline: {
    base: 'bg-transparent text-[var(--primary-color)] font-semibold border-2 border-[var(--primary-color)]',
    hover: 'hover:bg-[var(--primary-color)]/10',
    active: 'active:scale-[0.98]',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    full: 'bg-transparent text-[var(--primary-color)] font-semibold border-2 border-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300',
  },
  
  // Ghost Button (Minimale Aktionen)
  ghost: {
    base: 'bg-transparent text-gray-700 font-medium',
    hover: 'hover:bg-gray-100',
    active: 'active:scale-[0.98]',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    full: 'bg-transparent text-gray-700 font-medium hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300',
  },
  
  // Destructive Button (Lösch-Aktionen)
  destructive: {
    base: 'bg-red-500 text-white font-semibold shadow-md',
    hover: 'hover:bg-red-600 hover:shadow-lg',
    active: 'active:scale-[0.98]',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    full: 'bg-red-500 text-white font-semibold shadow-md hover:bg-red-600 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300',
  },
  
  // Icon Button (Nur Icon)
  icon: {
    base: 'bg-white text-gray-600 border border-gray-200 shadow-sm flex items-center justify-center',
    hover: 'hover:bg-gray-100 hover:text-gray-900',
    active: 'active:scale-95',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    full: 'bg-white text-gray-600 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',
  },
} as const;

// ============================================================================
// BUTTON SIZES (Mobile-First, Touch-Optimized)
// ============================================================================
export const buttonSizes = {
  sm: {
    height: 'h-10',           // 40px
    padding: 'px-4 py-2',
    fontSize: typography.buttonSmall.fontSize,
    iconSize: 'w-4 h-4',
    rounded: 'rounded-xl',
  },
  md: {
    height: 'h-12 sm:h-14',   // 48px mobile, 56px desktop
    padding: 'px-6 py-3',
    fontSize: typography.button.fontSize,
    iconSize: 'w-5 h-5 sm:w-6 sm:h-6',
    rounded: 'rounded-2xl',
  },
  lg: {
    height: 'h-14 sm:h-16',   // 56px mobile, 64px desktop
    padding: 'px-8 py-4',
    fontSize: typography.button.fontSize,
    iconSize: 'w-6 h-6 sm:w-7 sm:h-7',
    rounded: 'rounded-2xl',
  },
  icon: {
    size: 'w-10 h-10 sm:w-12 sm:h-12',  // 40px mobile, 48px desktop (min 44px für Touch)
    padding: 'p-0',
    iconSize: 'w-5 h-5 sm:w-6 sm:h-6',
    rounded: 'rounded-full',
  },
} as const;

// ============================================================================
// CARD VARIANTS
// ============================================================================
export const cardVariants = {
  default: {
    base: 'bg-white rounded-2xl border border-gray-200 shadow-sm',
    hover: 'hover:shadow-md hover:border-[var(--primary-color)]/50',
    active: 'active:scale-[0.99]',
    full: 'bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[var(--primary-color)]/50 active:scale-[0.99] transition-all duration-300',
  },
  elevated: {
    base: 'bg-white rounded-2xl shadow-lg',
    hover: 'hover:shadow-xl',
    active: 'active:scale-[0.99]',
    full: 'bg-white rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.99] transition-all duration-300',
  },
  gradient: {
    base: 'bg-gradient-to-br from-[var(--primary-color)]/10 to-[var(--secondary-color)]/10 rounded-2xl border border-[var(--primary-color)]/20',
    hover: 'hover:from-[var(--primary-color)]/20 hover:to-[var(--secondary-color)]/20',
    active: 'active:scale-[0.99]',
    full: 'bg-gradient-to-br from-[var(--primary-color)]/10 to-[var(--secondary-color)]/10 rounded-2xl border border-[var(--primary-color)]/20 hover:from-[var(--primary-color)]/20 hover:to-[var(--secondary-color)]/20 active:scale-[0.99] transition-all duration-300',
  },
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const borderRadius = {
  sm: 'rounded-lg',      // 8px
  md: 'rounded-xl',      // 12px
  lg: 'rounded-2xl',     // 16px
  full: 'rounded-full',  // 9999px
} as const;

// ============================================================================
// SHADOWS
// ============================================================================
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  brand: 'shadow-lg shadow-[var(--primary-color)]/20',
  brandHover: 'shadow-xl shadow-[var(--primary-color)]/30',
} as const;

// ============================================================================
// ANIMATIONS
// ============================================================================
export const animations = {
  fadeIn: 'animate-fade-in-view',
  slideInRight: 'animate-slide-in-right',
  slideInLeft: 'animate-slide-in-left',
  transition: 'transition-all duration-300',
  transitionFast: 'transition-all duration-200',
  transitionSlow: 'transition-all duration-500',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Kombiniert Button-Klassen basierend auf Variante und Größe
 */
export function getButtonClasses(
  variant: keyof typeof buttonVariants = 'primary',
  size: keyof typeof buttonSizes = 'md',
  fullWidth: boolean = false
): string {
  const variantClasses = buttonVariants[variant].full;
  const sizeConfig = buttonSizes[size];
  
  // Icon-Buttons haben 'size' statt 'height'
  const sizeClasses = 'size' in sizeConfig 
    ? `${sizeConfig.size} ${sizeConfig.padding} ${sizeConfig.rounded}`
    : `${sizeConfig.height} ${sizeConfig.padding} ${sizeConfig.rounded}`;
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return `${variantClasses} ${sizeClasses} ${widthClass} flex items-center justify-center gap-2`.trim();
}

/**
 * Kombiniert Card-Klassen basierend auf Variante
 */
export function getCardClasses(
  variant: keyof typeof cardVariants = 'default',
  padding: keyof typeof spacing = 'md'
): string {
  const variantClasses = cardVariants[variant].full;
  const paddingClass = `p-${padding}`;
  
  return `${variantClasses} ${paddingClass}`.trim();
}

/**
 * Gibt Typography-Klassen zurück
 */
export function getTypographyClasses(
  variant: keyof typeof typography
): string {
  const typo = typography[variant];
  return `${typo.fontSize} ${typo.fontWeight} ${typo.lineHeight}`.trim();
}
