/** @type {import('tailwindcss').Config} */
export default {
    content: ['./pb_hooks/pages/**/*.{ejs,md}'],
    darkMode: 'class',
    theme: {
        extend: {},
    },
    daisyui: {
        themes: ['sunset', 'winter', 'corporate', 'night', 'business', 'dark'],
        darkTheme: 'winter',
        base: true,
        styled: true,
        utils: true,
    },
    plugins: [require('@tailwindcss/typography'), require('daisyui')],
}
