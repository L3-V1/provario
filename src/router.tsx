import { createHashRouter } from 'react-router'
import Layout from './components/Layout'
import Configuracoes from './pages/Configuracoes'
import Inicio from './pages/Inicio'
import PerfilForm from './pages/PerfilForm'
import Perfis from './pages/Perfis'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'perfis', element: <Perfis /> },
      { path: 'perfis/novo', element: <PerfilForm /> },
      { path: 'perfis/:id', element: <PerfilForm /> },
      { path: 'configuracoes', element: <Configuracoes /> },
    ],
  },
]

export const router = createHashRouter(routes)
