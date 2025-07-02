import UserDashboard from "@/components/auth/UserDashboard"
import AuthGuard from "@/components/auth/AuthGuard"

export default function DashboardPage() {
  return (
    <AuthGuard>
      <UserDashboard />
    </AuthGuard>
  )
}
