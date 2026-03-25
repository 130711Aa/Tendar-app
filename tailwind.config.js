/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Manrope', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'sans-serif'],
            },
            colors: {
                primary: '#ff8c00',
                'primary-dark': '#e67e00',
                'bg-light': '#fcfaf8',
                'bg-dark': '#231a0f',
                'text-main': '#181510',
            },
            borderRadius: {
                DEFAULT: '0.5rem',
                lg: '1rem',
                xl: '1.5rem',
                '2xl': '1.5rem',
                full: '9999px',
            },
        },
    },
    plugins: [],
}
