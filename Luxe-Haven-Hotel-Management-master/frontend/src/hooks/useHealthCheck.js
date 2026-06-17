import { useEffect, useState } from 'react'
import api from '../services/api'

export function useHealthCheck() {
  const [status, setStatus] = useState('Checking API...')

  useEffect(() => {
    api
      .get('/health')
      .then((response) => setStatus(response.data.message))
      .catch(() => setStatus('API is not connected yet'))
  }, [])

  return status
}
