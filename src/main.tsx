import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/src/styles/globals.css'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/src/app/App'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
