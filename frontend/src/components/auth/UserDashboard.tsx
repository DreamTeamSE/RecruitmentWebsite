'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import type { AuthenticatedUser } from '@/models/types/auth';
import { Button } from '@/components/ui/button';

interface DashboardAction {
  label: string;
  path: string;
  variant: 'default' | 'secondary' | 'destructive';
  icon?: React.ReactNode;
}

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
);

const UserInfoCard = ({ user }: { user: AuthenticatedUser }) => (
  <div className="bg-gray-50 p-6 rounded-lg">
    <h2 className="text-lg font-semibold text-gray-800 mb-4">User Information</h2>
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="font-medium text-gray-600">Name:</span>
        <span className="text-gray-900">{user.name}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium text-gray-600">Email:</span>
        <span className="text-gray-900">{user.email}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium text-gray-600">Role:</span>
        <span className="text-gray-900 capitalize">{user.role}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium text-gray-600">Email Verified:</span>
        <span className={`font-medium ${
          user.emailVerified ? 'text-green-600' : 'text-red-600'
        }`}>
          {user.emailVerified ? 'Verified' : 'Not Verified'}
        </span>
      </div>
    </div>
  </div>
);

const QuickActionsCard = ({ 
  actions, 
  onActionClick, 
  onSignOut 
}: { 
  actions: DashboardAction[];
  onActionClick: (path: string) => void;
  onSignOut: () => void;
}) => (
  <div className="bg-gray-50 p-6 rounded-lg">
    <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
    <div className="space-y-3">
      {actions.map((action) => (
        <Button
          key={action.path}
          onClick={() => onActionClick(action.path)}
          variant={action.variant}
          className="w-full justify-start"
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
      <Button
        onClick={onSignOut}
        variant="destructive"
        className="w-full"
      >
        Sign Out
      </Button>
    </div>
  </div>
);

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleActionClick = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const handleSignOut = useCallback(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const user = session?.user as AuthenticatedUser;
  if (!user) {
    return null;
  }

  const dashboardActions: DashboardAction[] = [
    {
      label: 'View Applications',
      path: '/applications-review',
      variant: 'default'
    },
    {
      label: 'Create New Form',
      path: '/applications-review/create',
      variant: 'secondary'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user.name}</p>
          </header>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <UserInfoCard user={user} />
            <QuickActionsCard 
              actions={dashboardActions}
              onActionClick={handleActionClick}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
