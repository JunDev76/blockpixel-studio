import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import './index.css'
import App from '@/App.tsx'
import { StoreProvider } from '@/store'
import { LibraryPage } from '@/pages/LibraryPage'
import { StyleSheetPage } from '@/pages/StyleSheetPage'
import { ItemDetailPage } from '@/pages/ItemDetailPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/library" replace /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'sheets/:sheetId', element: <StyleSheetPage /> },
      {
        path: 'sheets/:sheetId/items/:itemId',
        element: <ItemDetailPage />,
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  </StrictMode>,
)