import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          pink: {
            DEFAULT: "var(--brand-pink)",
            50: "var(--brand-pink-50)",
            100: "var(--brand-pink-100)",
            200: "var(--brand-pink-200)",
            300: "var(--brand-pink-300)",
            400: "var(--brand-pink-400)",
            500: "var(--brand-pink-500)",
            600: "var(--brand-pink-600)",
            700: "var(--brand-pink-700)",
          },
          cyan: {
            DEFAULT: "var(--brand-cyan)",
            50: "var(--brand-cyan-50)",
            100: "var(--brand-cyan-100)",
            200: "var(--brand-cyan-200)",
            300: "var(--brand-cyan-300)",
            400: "var(--brand-cyan-400)",
            500: "var(--brand-cyan-500)",
            600: "var(--brand-cyan-600)",
            700: "var(--brand-cyan-700)",
          },
          ink: {
            DEFAULT: "var(--brand-ink)",
            900: "var(--brand-ink-900)",
            800: "var(--brand-ink-800)",
            700: "var(--brand-ink-700)",
            600: "var(--brand-ink-600)",
          },
          mist: {
            DEFAULT: "var(--brand-mist)",
            100: "var(--brand-mist-100)",
            200: "var(--brand-mist-200)",
          },
          money: {
            DEFAULT: "var(--brand-money)",
            600: "var(--brand-money-600)",
          },
          alert: "var(--brand-alert)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["3rem", { lineHeight: "3.25rem", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-lg": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em", fontWeight: "800" }],
        "display-md": ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-sm": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em", fontWeight: "700" }],
        "money-xl": ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        "money-lg": ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.015em", fontWeight: "700" }],
        "money-md": ["1.25rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        micro: ["0.6875rem", { lineHeight: "0.875rem", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      boxShadow: {
        "card-tactile": "var(--shadow-card-tactile)",
        "card-tactile-lg": "var(--shadow-card-tactile-lg)",
        "brand-glow-pink": "var(--shadow-brand-glow-pink)",
        "brand-glow-cyan": "var(--shadow-brand-glow-cyan)",
      },
      backgroundImage: {
        "gradient-brand": "var(--gradient-brand)",
        "gradient-cyber": "var(--gradient-cyber)",
        "gradient-ink": "var(--gradient-ink)",
        "gradient-money": "var(--gradient-money)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "14px",
        button: "10px",
        pill: "999px",
      },
      minHeight: {
        touch: "var(--touch-min)",
      },
      minWidth: {
        touch: "var(--touch-min)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "count-up": {
          from: { transform: "translateY(0.25em)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in-up": {
          from: { transform: "translateY(0.5rem)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "tap-bounce": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.96)" },
        },
        "pulse-glow-pink": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(254, 44, 85, 0.5)" },
          "50%": { boxShadow: "0 0 0 12px rgba(254, 44, 85, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "count-up": "count-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "tap-bounce": "tap-bounce 0.18s ease-in-out",
        "pulse-glow-pink": "pulse-glow-pink 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
