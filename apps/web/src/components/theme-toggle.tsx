'use client';

import * as React from 'react';

/**
 * Applies clinic branding (PRIMARY_COLOR) to CSS variables at runtime from
 * organisation settings stored server-side. This is the white-label mechanism:
 * no clinic color is hard-coded in source.
 */
export function BrandTheme({ primaryColor }: { primaryColor?: string }) {
  React.useEffect(() => {
    const root = document.documentElement;
    const color = primaryColor || '#0d9488';
    // Derive a small 50/100 tint for badge backgrounds.
    root.style.setProperty('--brand-50', `${color}14`);
    root.style.setProperty('--brand-100', `${color}22`);
    root.style.setProperty('--brand-600', color);
    root.style.setProperty('--brand-700', color);
    root.style.setProperty('--brand-800', color);
  }, [primaryColor]);
  return null;
}
