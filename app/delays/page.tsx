import { redirect } from 'next/navigation'

export default function DelaysIndexPage() {
  // Redirect to Bristol by default
  redirect('/delays/BRS')
}
