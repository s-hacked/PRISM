/**
 * Tailwind config — visual system for the PRISM predictive intelligence console.
 * Light-mode rendering of the dense "telemetry / AI dashboard" aesthetic:
 * soft cards, vivid accent telemetry, gradient headlines, tabular numerics.
 */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Canvas & structure
        canvas: '#EEF1F8',
        surface: '#FFFFFF',
        ink: '#0F172A',
        muted: '#64748B',
        faint: '#94A3B8',
        hairline: '#E2E8F0',
        'hairline-soft': '#EEF2F7',

        // Telemetry accents
        'accent-cyan': '#0891B2',
        'accent-blue': '#2563EB',
        'accent-violet': '#7C3AED',
        'accent-emerald': '#059669',
        'accent-amber': '#D97706',
        'accent-rose': '#E11D48',

        // ── Legacy Stitch token aliases ────────────────────────
        // Mapped onto the new light palette so existing page markup
        // renders in the refreshed visual language without churn.
        'surface-container-lowest': '#FFFFFF',
        'surface-container-low': '#F8FAFC',
        'surface-container': '#F1F5F9',
        'surface-container-high': '#EDF1F7',
        'surface-container-highest': '#E2E8F0',
        'on-surface': '#0F172A',
        'on-surface-variant': '#64748B',
        'outline-variant': '#CBD5E1',
        'outline': '#94A3B8',
        surface: '#FFFFFF',
        primary: '#2563EB',
        'primary-container': '#2563EB',
        'on-primary': '#FFFFFF',
        'primary-fixed': '#DBEAFE',
        'on-primary-fixed-variant': '#1E40AF',
        secondary: '#0891B2',
        'secondary-container': '#CFFAFE',
        tertiary: '#059669',
        'tertiary-container': '#059669',
        'tertiary-fixed': '#D1FAE5',
        error: '#E11D48',
        'error-container': '#FFE4E6',
        'on-error-container': '#9F1239',
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15,23,42,0.05)',
        '2xs': '0 1px 1px rgba(15,23,42,0.04)',
        card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -14px rgba(15,23,42,0.18)',
        'card-hover': '0 1px 3px rgba(15,23,42,0.06), 0 16px 36px -18px rgba(15,23,42,0.24)',
        popover: '0 8px 24px -6px rgba(15,23,42,0.18), 0 2px 6px -2px rgba(15,23,42,0.10)',
        rail: '1px 0 0 rgba(226,232,240,0.9)',
        'glow-cyan': '0 6px 20px -8px rgba(8,145,178,0.55)',
        'glow-violet': '0 6px 20px -8px rgba(124,58,237,0.55)',
        'glow-emerald': '0 6px 20px -8px rgba(5,150,105,0.55)',
        'glow-amber': '0 6px 20px -8px rgba(217,119,6,0.55)',
        'glow-rose': '0 6px 20px -8px rgba(225,29,72,0.55)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-xl': ['44px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-lg': ['32px', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'kpi': ['30px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'micro': ['10px', { lineHeight: '14px', letterSpacing: '0.08em', fontWeight: '600' }],
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in-right': { '0%': { transform: 'translateX(24px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'slide-up': { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  plugins: [],
};