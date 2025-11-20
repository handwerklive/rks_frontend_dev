import React from 'react';
import { buttonVariants, buttonSizes } from '../../lib/designSystem';

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * Einheitliche Button-Komponente basierend auf dem Design-System
 * 
 * @example
 * <Button variant="primary" size="md">Speichern</Button>
 * <Button variant="secondary" icon={<PlusIcon />}>Hinzufügen</Button>
 * <Button variant="icon" size="icon" icon={<TrashIcon />} aria-label="Löschen" />
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Basis-Klassen aus Design-System
    const variantClasses = buttonVariants[variant].full;
    const sizeConfig = buttonSizes[size];
    
    // Size-Klassen (Icon-Buttons haben 'size' statt 'height')
    const sizeClasses = 'size' in sizeConfig 
      ? `${sizeConfig.size} ${sizeConfig.padding} ${sizeConfig.rounded}`
      : `${sizeConfig.height} ${sizeConfig.padding} ${sizeConfig.rounded}`;
    
    // Width-Klasse
    const widthClass = fullWidth ? 'w-full' : '';
    
    // Layout-Klassen
    const layoutClasses = size === 'icon' 
      ? 'flex items-center justify-center'
      : 'flex items-center justify-center gap-2 sm:gap-3';
    
    // Icon-Größe
    const iconSizeClass = sizeConfig.iconSize;
    
    // Loading Spinner
    const spinner = (
      <svg
        className={`animate-spin ${iconSizeClass}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
    
    // Icon mit korrekter Größe
    const renderIcon = (iconElement: React.ReactNode) => {
      if (!iconElement) return null;
      return React.isValidElement(iconElement)
        ? React.cloneElement(iconElement as React.ReactElement, {
            className: `${iconSizeClass} ${(iconElement as React.ReactElement).props.className || ''}`.trim(),
          })
        : iconElement;
    };
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${variantClasses} ${sizeClasses} ${widthClass} ${layoutClasses} ${className}`.trim()}
        {...props}
      >
        {loading && spinner}
        {!loading && icon && iconPosition === 'left' && renderIcon(icon)}
        {children && <span className={size === 'md' || size === 'lg' ? 'text-base sm:text-lg' : ''}>{children}</span>}
        {!loading && icon && iconPosition === 'right' && renderIcon(icon)}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
