# User Data Layer Architecture

## Cấu Trúc Thư Mục

```
lib/
├── types/
│   └── user.ts                 # User models và interfaces
├── dao/
│   └── userDAO.ts              # Data Access Object layer
├── services/
│   └── userService.ts          # Business logic layer
├── repositories/
│   └── userRepository.ts       # Repository pattern cho DB abstraction
├── contexts/
│   └── AuthContext.tsx         # Global auth state (React Context)
└── hooks/
    └── useUser.ts              # Custom hooks để access user data

app/
└── api/
    └── auth/
        ├── register/route.ts   # Register endpoint
        ├── login/route.ts      # Login endpoint
        └── logout/route.ts     # Logout endpoint
    └── users/
        ├── route.ts            # Get all users (admin)
        └── [id]/route.ts       # Get/Update/Delete user
```

## Kiến Trúc Phân Lớp (Layered Architecture)

### 1. Types Layer (`lib/types/user.ts`)
Định nghĩa tất cả interfaces và types cho user:
- `User` - Model người dùng
- `LoginCredentials` - Thông tin đăng nhập
- `RegisterData` - Dữ liệu đăng ký
- `AuthResponse` - Response sau auth
- `UserSession` - Session hiện tại

### 2. Data Access Layer (DAO)
#### `lib/dao/userDAO.ts`
- Xử lý trực tiếp với data storage (localStorage hiện tại)
- Các method: `getAllUsers()`, `getUserById()`, `createUser()`, `updateUser()`, `deleteUser()`
- `login()` - Xác thực người dùng
- `changePassword()` - Đổi mật khẩu
- Session management: `saveSession()`, `getCurrentSession()`, `isAuthenticated()`

### 3. Service Layer
#### `lib/services/userService.ts`
- Business logic layer
- Xử lý validation và authorization
- Gọi DAO để thao tác dữ liệu
- Methods: `register()`, `login()`, `logout()`, `updateProfile()`, `changePassword()`

### 4. Repository Pattern
#### `lib/repositories/userRepository.ts`
- Interface `IUserRepository` định nghĩa contract
- Abstract class `BaseUserRepository` cung cấp common logic
- Implementation: `LocalStorageUserRepository` (hiện tại)
- **Lợi ích**: Dễ dàng switch sang Firebase/Supabase/SQL sau

### 5. Context & State Management
#### `lib/contexts/AuthContext.tsx`
- React Context Provider cho global auth state
- Provides: `user`, `token`, `isLoggedIn`, `isLoading`, `error`
- Methods: `login()`, `register()`, `logout()`, `clearError()`

### 6. Custom Hooks
#### `lib/hooks/useUser.ts`
- `useUser()` - Access current user data
- `useUserPermission()` - Check permissions (canEditUser, canDeleteUser, etc.)
- `useUserProfile()` - Profile completion tracking

### 7. API Layer
#### `app/api/auth/` - Authentication endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

#### `app/api/users/` - User management endpoints
- `GET /api/users` - List all users (admin only)
- `GET /api/users/[id]` - Get user by ID
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user (admin only)

## Data Flow

### Registration Flow
```
RegisterForm 
  → useAuth().register()
  → userService.register()
  → userDAO.createUser()
  → Save to localStorage
  → Update AuthContext
  → Redirect to quiz
```

### Login Flow
```
LoginForm
  → useAuth().login()
  → userService.login()
  → userDAO.login()
  → Verify password
  → Save session to localStorage
  → Update AuthContext
  → Redirect to dashboard
```

### Accessing User Data
```
Component
  → useAuth() hoặc useUser()
  → Get current user from context
  → Display user information
```

## Database Migration Path

### Hiện Tại (Development)
- Dùng `LocalStorageUserRepository`
- Data lưu trong browser localStorage
- Password hash bằng btoa (không secure)

### Tương Lai (Production)

#### Option 1: Neon PostgreSQL
```typescript
export class NeonUserRepository extends BaseUserRepository {
  // Implement using Drizzle ORM
  async create(data: RegisterData): Promise<User> {
    // Query database
  }
  // ... other methods
}
```

#### Option 2: Supabase
```typescript
export class SupabaseUserRepository extends BaseUserRepository {
  // Implement using Supabase client
  async create(data: RegisterData): Promise<User> {
    // Call Supabase API
  }
  // ... other methods
}
```

#### Option 3: Firebase
```typescript
export class FirebaseUserRepository extends BaseUserRepository {
  // Implement using Firebase SDK
  async create(data: RegisterData): Promise<User> {
    // Call Firebase Auth
  }
  // ... other methods
}
```

**Migration Steps:**
1. Implement new repository class
2. Update `userService.ts` hoặc tạo factory pattern
3. Swap implementation (localStorage → database)
4. Database schema migration
5. User data migration script

## Security Notes

### Hiện Tại (Not for Production)
- ⚠️ Password hash dùng `btoa()` - **NOT SECURE**
- ⚠️ Token generation đơn giản - **NOT SECURE**
- ⚠️ No HTTPS/TLS
- ⚠️ No rate limiting
- ✅ Dùng để phát triển/demo

### Để Production Ready
- [ ] Dùng bcrypt cho password hashing
- [ ] Dùng JWT với secret key
- [ ] Implement HTTPS
- [ ] Rate limiting trên API
- [ ] CSRF protection
- [ ] Input validation & sanitization
- [ ] SQL injection prevention (với DB thực)
- [ ] Session timeout
- [ ] Refresh token mechanism

## Usage Examples

### Trong Component
```typescript
'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { useUser } from '@/lib/hooks/useUser'

export function UserProfile() {
  const { user, isLoggedIn, logout } = useAuth()
  const { userName, isAdmin } = useUser()

  if (!isLoggedIn) return <div>Please login</div>

  return (
    <div>
      <h1>Welcome, {userName}</h1>
      {isAdmin && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Login/Register
```typescript
const { register, login } = useAuth()

// Register
await register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  confirmPassword: 'password123'
})

// Login
await login({
  email: 'john@example.com',
  password: 'password123'
})
```

## Setup Instructions

### 1. Thêm AuthProvider vào Layout
```typescript
// app/layout.tsx
import { AuthProvider } from '@/lib/contexts/AuthContext'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 2. Sử dụng trong Components
```typescript
'use client'
import { useAuth } from '@/lib/contexts/AuthContext'

export function MyComponent() {
  const { user, isLoggedIn } = useAuth()
  // ...
}
```

## Testing

### Unit Tests
```typescript
// tests/userDAO.test.ts
describe('UserDAO', () => {
  it('should create user', async () => {
    const response = await userDAO.createUser({...})
    expect(response.user.email).toBe('...')
  })
})
```

### Integration Tests
```typescript
// tests/api/auth.test.ts
describe('Auth API', () => {
  it('POST /api/auth/register should register user', async () => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({...})
    })
    expect(res.status).toBe(201)
  })
})
```
