import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/src/styles/globals.css'
import { BrowserRouter } from 'react-router-dom'
import { App } from '@/src/app/App'
import { AppProviders } from '@/src/providers/AppProviders'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
)
