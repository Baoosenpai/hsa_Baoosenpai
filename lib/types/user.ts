// User Model/Type Definition
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Nên hash trong thực tế
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
  role: 'student' | 'teacher' | 'admin';
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface UserSession {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
