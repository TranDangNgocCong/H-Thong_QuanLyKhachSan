import { createContext, useContext } from 'react'

const AppContext = createContext({
  appName: 'Hotel Booking Management System',
})

export function AppProvider({ children }) {
  return (
    <AppContext.Provider value={{ appName: 'Hotel Booking Management System' }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}
