import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import Cookies from "js-cookie"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAuthToken(): string | null {
  return Cookies.get('auth_token') || localStorage.getItem('token') || null
}
