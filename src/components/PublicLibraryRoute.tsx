import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PublicLibraryRouteProps {
  children: React.ReactNode | ((isPublic: boolean) => React.ReactNode);
}

export const PublicLibraryRoute: React.FC<PublicLibraryRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const isPublicMode = searchParams.get('public') === 'true';

  // If public mode, allow access without authentication
  if (isPublicMode) {
    return <>{typeof children === 'function' ? children(true) : children}</>;
  }

  // Otherwise, require authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{typeof children === 'function' ? children(false) : children}</>;
};
