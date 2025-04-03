"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { useSettings } from "@/context/SettingsContext"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function ThemeSetting() {
  const { theme, setTheme } = useTheme()
  const { updateTheme } = useSettings()

  useEffect(() => {
    updateTheme(theme)
  }, [theme, updateTheme])

  return (
    <div className="space-y-4">
      <RadioGroup
        value={theme}
        onValueChange={(value) => {
          setTheme(value)
          updateTheme(value)
        }}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="light" id="light" />
          <Label htmlFor="light">Light</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="dark" />
          <Label htmlFor="dark">Dark</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="system" id="system" />
          <Label htmlFor="system">System</Label>
        </div>
      </RadioGroup>
    </div>
  )
}

