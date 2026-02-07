import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#FC74FE',
                    600: '#E753E8',
                    700: '#C43BC4',
                },
                secondary: {
                    DEFAULT: '#FFD9FE',
                },
                background: '#FFFFFF',
                surface: '#F7F0FF',
                border: '#E9E9E9',
                text: {
                    primary: '#000000',
                    secondary: '#666666',
                    muted: '#999999',
                },
                success: '#00D395',
                error: '#FF5C5C',
            },
            fontFamily: {
                sans: ['var(--font-inter)'],
                mono: ['var(--font-mono)'],
            },
        },
    },
    plugins: [],
}
export default config
