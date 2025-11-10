import { createFileRoute } from '@tanstack/react-router'
import Resources from '../../pages/Resources'

export const Route = createFileRoute('/_protected/resources')({
  component: Resources,
})
