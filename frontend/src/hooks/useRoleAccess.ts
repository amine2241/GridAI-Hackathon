import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Role = 'admin' | 'user';

export function useRoleAccess(allowedRoles: Role[] = []) {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // If still loading auth state, do nothing yet
        if (isLoading) return;

        // 1. Not authenticated -> Redirect to login
        if (!token || !user) {
            // Don't redirect if we're already on public pages like login or register
            if (pathname !== '/login' && pathname !== '/register' && pathname !== '/public-chat') {
                router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
            }
            return;
        }

        // 2. Authenticated but insufficient role -> Redirect to home
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            router.push('/');
            return;
        }

    }, [user, isLoading, token, router, pathname, allowedRoles]);

    return {
        isAuthorized: !!user && (allowedRoles.length === 0 || allowedRoles.includes(user.role)),
        isLoading
    };
}
