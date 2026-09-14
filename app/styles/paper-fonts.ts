import { Archivo, Bodoni_Moda, Martian_Mono } from 'next/font/google'

/* The press the whole app is printed on: a Didone for the display voice, a
   tight grotesk for running text, and a wide mono for anything that behaves
   like flight data. Loaded once in the root layout so `--display`, `--body`
   and `--code` in globals.css resolve on every route. */
const display = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '700'],
  variable: '--font-display',
  display: 'swap',
})

const body = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const code = Martian_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-code',
  display: 'swap',
})

export const paperFontVars = `${display.variable} ${body.variable} ${code.variable}`
