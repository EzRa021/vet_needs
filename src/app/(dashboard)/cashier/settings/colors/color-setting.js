"use client"

import { useEffect, useState } from "react"
import { useSettings } from "@/context/SettingsContext"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"

const themes = [
  "red",
  "rose",
  "orange",
  "green",
  "blue",
  "yellow",
  "violet",
]

export function ColorSetting() {
  const { colorTheme, updateColorTheme } = useSettings()
  const [selectedTheme, setSelectedTheme] = useState(colorTheme)

  useEffect(() => {
    setSelectedTheme(colorTheme)
  }, [colorTheme])

  const handleThemeChange = (theme) => {
    setSelectedTheme(theme)
    updateColorTheme(theme)
    
    // Remove any existing theme
    document.documentElement.classList.forEach((className) => {
      if (className.startsWith('theme-')) {
        document.documentElement.classList.remove(className)
      }
    })
    
    // Remove existing data-theme attribute
    const existingTheme = document.documentElement.getAttribute('data-theme')
    if (existingTheme) {
      document.documentElement.removeAttribute('data-theme')
    }
    
    // Apply new theme
    document.documentElement.setAttribute('data-theme', theme)
  }

  // Apply initial theme on mount
  useEffect(() => {
    if (colorTheme) {
      handleThemeChange(colorTheme)
    }
  }, [])

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedTheme} onValueChange={handleThemeChange}>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((theme) => (
            <div key={theme} className="flex items-center space-x-2">
              <RadioGroupItem value={theme} id={theme} />
              <Label htmlFor={theme} className="capitalize">
                {theme}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  )
}