import { createContext, useContext, useState, ReactNode } from 'react'

interface PrivacyContextType {
  hideNumbers: boolean
  toggleNumbers: () => void
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideNumbers, setHideNumbers] = useState(false)
  
  const toggleNumbers = () => {
    setHideNumbers(prev => !prev)
  }

  return (
    <PrivacyContext.Provider value={{ hideNumbers, toggleNumbers }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const context = useContext(PrivacyContext)
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider')
  }
  return context
}
