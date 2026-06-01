import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

type AlertType = 'info' | 'danger' | 'warning' | 'success'

interface AlertOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: AlertType
  onConfirm: () => void
  onCancel?: () => void
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void
  closeAlert: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<AlertOptions | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const showAlert = useCallback((options: AlertOptions) => {
    setConfig(options)
    setIsOpen(true)
  }, [])

  const closeAlert = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => setConfig(null), 300) // Clear after animation
  }, [])

  const handleConfirm = () => {
    config?.onConfirm()
    closeAlert()
  }

  const handleCancel = () => {
    config?.onCancel?.()
    closeAlert()
  }

  // Focus management
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmButtonRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCancel])

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert }}>
      {children}
      
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={handleCancel}
      />

      {/* Modal Container */}
      <div className={`
        fixed inset-0 z-[151] flex items-center justify-center p-4 pointer-events-none
      `}>
        {/* Modal Card */}
        <div 
          className={`
            w-full max-w-sm bg-white dark:bg-[#101010] rounded-lg shadow-2xl 
            transform transition-all duration-300 pointer-events-auto
            flex flex-col overflow-hidden
            ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}
          `}
          role="alertdialog"
          aria-modal="true"
        >
          {config && (
            <>
              <div className="p-6 text-center">
                {/* Icon based on type */}
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-[#111111]">
                  {config.type === 'danger' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600 dark:text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600 dark:text-[#888]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f0f0f0] mb-2">
                  {config.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-[#888]">
                  {config.message}
                </p>
              </div>

              <div className="flex border-t border-slate-100 dark:border-[#1f1f1f] divide-x divide-slate-100 dark:divide-slate-800">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-4 text-sm font-medium text-slate-600 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] transition-colors focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50"
                >
                  {config.cancelText || 'Cancel'}
                </button>
                <button
                  ref={confirmButtonRef}
                  onClick={handleConfirm}
                  className={`
                    flex-1 py-4 text-sm font-bold hover:bg-slate-50 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] transition-colors focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/50
                    ${config.type === 'danger' ? 'text-red-600 dark:text-red-500' : 'text-blue-600 dark:text-blue-500'}
                  `}
                >
                  {config.confirmText || 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AlertContext.Provider>
  )
}
