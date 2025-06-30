"use client"

import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react"
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode"

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fonts: {
        heading: { value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
        body: { value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
      },
      fontSizes: {
        xs: { value: "12px" },
        sm: { value: "14px" },
        md: { value: "15px" },
        lg: { value: "16px" },
        xl: { value: "18px" },
        "2xl": { value: "20px" },
        "3xl": { value: "24px" },
        "4xl": { value: "28px" },
        "5xl": { value: "32px" },
      },
      lineHeights: {
        shorter: { value: "1.25" },
        short: { value: "1.375" },
        base: { value: "1.5" },
        tall: { value: "1.625" },
        taller: { value: "2" },
      },
      fontWeights: {
        normal: { value: "400" },
        medium: { value: "500" },
        semibold: { value: "600" },
        bold: { value: "700" },
      },
      colors: {
        figma: {
          blue: { value: "#5661F6" },
          purple: { value: "#6054FF" },
          accent: { value: "#459AFF" },
          gray: { value: "#F1F5F9" },
        },
      },
    },
  },
})

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
