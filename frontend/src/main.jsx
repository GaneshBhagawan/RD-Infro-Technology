import { StrictMode }    from 'react'
import { createRoot }    from 'react-dom/client'
import { Provider }      from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Toaster }       from 'react-hot-toast'
import { store }         from './app/store.js'
import App               from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color:      '#f1f5f9',
              border:     '0.5px solid rgba(255,255,255,0.1)',
              fontSize:   '13px',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#0f172a' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#0f172a' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>
)