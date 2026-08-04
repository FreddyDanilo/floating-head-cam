import React, { useEffect, useState } from 'react'
import { Camera } from './components/camera'
import { Settings } from './components/settings'
import { About } from './components/about'

function App(): React.JSX.Element {
  const [route, setRoute] = useState<string>('')

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash)
    }
    
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route === '#/settings') {
    return <Settings />
  }

  if (route === '#/about') {
    return <About />
  }

  return <Camera />
}

export default App
