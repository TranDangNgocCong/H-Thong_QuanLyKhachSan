import { AppProvider } from './context/AppContext'
import { Dashboard } from './pages/Dashboard'
import './App.css'

function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  )
}

export default App
