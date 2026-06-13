import { StrictMode }    from 'react'
import { createRoot }    from 'react-dom/client'
import { Provider }      from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store }         from './app/store.js'
import App               from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Redux store — available to every component via useSelector/useDispatch */}
    <Provider store={store}>
      {/* BrowserRouter — enables React Router in the whole app */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>
)