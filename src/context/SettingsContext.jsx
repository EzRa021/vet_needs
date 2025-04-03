"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(undefined);

export function SettingsProvider({ children }) {
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [theme, setTheme] = useState("system")
  const [colorTheme, setColorTheme] = useState("zinc")

  useEffect(() => {
    const savedTheme = localStorage.getItem('colorTheme')
    const savedLowStockThreshold = localStorage.getItem('lowStockThreshold')
    const savedItemsPerPage = localStorage.getItem('itemsPerPage')
    const savedTheme2 = localStorage.getItem('theme')

    if (savedTheme) {
      setColorTheme(savedTheme)
    }
    if (savedLowStockThreshold) {
      setLowStockThreshold(parseInt(savedLowStockThreshold, 10))
    }
    if (savedItemsPerPage) {
      setItemsPerPage(parseInt(savedItemsPerPage, 10))
    }
    if (savedTheme2) {
      setTheme(savedTheme2)
    }
  }, [])

  useEffect(() => {
    if (theme) {
      document.documentElement.className = theme
    }
    if (colorTheme) {
      document.documentElement.setAttribute('data-theme', colorTheme)
    }
  }, [theme, colorTheme])
  
  const updateTheme = (value) => {
    setTheme(value)
    localStorage.setItem("theme", value)
    document.documentElement.className = value
  }
  
  const updateLowStockThreshold = (value) => {
    setLowStockThreshold(value)
    localStorage.setItem("lowStockThreshold", value.toString())
  }

  const updateItemsPerPage = (value) => {
    setItemsPerPage(value)
    localStorage.setItem("itemsPerPage", value.toString())
  }

  const updateColorTheme = (value) => {
    setColorTheme(value)
    localStorage.setItem("colorTheme", value) // Changed from "color-theme" to "colorTheme"
    document.documentElement.setAttribute("data-theme", value)
  }

  return (
    <SettingsContext.Provider value={{ 
      lowStockThreshold, 
      itemsPerPage, 
      theme, 
      colorTheme, 
      updateLowStockThreshold, 
      updateItemsPerPage, 
      updateTheme, 
      updateColorTheme 
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

