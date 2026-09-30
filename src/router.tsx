import { createHashRouter } from 'react-router'
import Layout from './components/Layout'
import Configuracoes from './pages/Configuracoes'
import Inicio from './pages/Inicio'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'configuracoes', element: <Configuracoes /> },
    ],
  },
]

export const router = createHashRouter(routes)
