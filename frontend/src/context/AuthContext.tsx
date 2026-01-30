'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { getAuthToken } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    email: string;
    name: string;
    username: string; // fallback if name is absent, though we updated API
    role: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // KEYCLOAK_CONFIG removed as it was unused and causing warnings in production build
    const logout = useCallback(() => {
        Cookies.remove('auth_token');
        localStorage.removeItem('token'); // Clear backup storage
        setUser(null);
        setToken(null);
        router.push('/login');
    }, [router]);

    const fetchUser = useCallback(async (authToken: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setToken(authToken);
            } else {
                logout();
            }
        } catch (error) {
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [logout, API_URL]);

    useEffect(() => {
        const checkSession = async () => {
            const savedToken = getAuthToken();
            if (savedToken) {
                await fetchUser(savedToken);
            } else {
                setIsLoading(false);
            }
        };
        checkSession();
    }, [fetchUser]);

    const login = useCallback(async (newToken: string) => {
        Cookies.set('auth_token', newToken, { expires: 7, path: '/' });
        await fetchUser(newToken);
    }, [fetchUser]);


    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
