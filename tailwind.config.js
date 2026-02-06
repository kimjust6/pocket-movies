/** @type {import('tailwindcss').Config} */
export default {
    content: ['./pb_hooks/pages/**/*.{ejs,md}'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
            },
        },
    },
    daisyui: {
        themes: [
            {
                yellowdark: {
                    "primary": "#FACC15",          // Vibrant yellow
                    "primary-content": "#1C1917",   // Dark text on yellow
                    "secondary": "#e4b159ff",         // Amber/orange
                    "secondary-content": "#1C1917", // Dark text on amber
                    "accent": "#EAB308",            // Yellow accent
                    "accent-content": "#1C1917",    // Dark text on accent
                    "neutral": "#1C1917",           // Dark neutral
                    "neutral-content": "#D4D4D4",   // Light text on dark
                    "base-100": "#000000ff",          // Darkest background
                    "base-200": "#201f1fff",          // Slightly lighter
                    "base-300": "#2b2826ff",          // Even lighter
                    "base-content": "#E7E5E4",      // Light content text
                    "info": "#38BDF8",              // Sky blue
                    "info-content": "#1C1917",
                    "success": "#4ADE80",           // Green
                    "success-content": "#1C1917",
                    "warning": "#FB923C",           // Orange
                    "warning-content": "#1C1917",
                    "error": "#dd2e2eff",             // Red (Darker)
                    "error-content": "#1C1917",
                },
            },
            'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden', 'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black', 'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade', 'night', 'coffee', 'winter', 'dim', 'nord', 'sunset'
        ],
        darkTheme: 'yellowdark',
        base: true,
        styled: true,
        utils: true,
    },
    plugins: [require('@tailwindcss/typography'), require('daisyui')],
}
