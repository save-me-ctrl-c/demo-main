import { createPortal } from 'react-dom'

function Portal({ children }) {
  const root = document.getElementById('portal-root')
  return root ? createPortal(children, root) : null
}

export default Portal
