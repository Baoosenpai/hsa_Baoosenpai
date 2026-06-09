# User Data Management Layer

## 📋 Tổng Quan

Đây là data layer của Exam Academy được thiết kế với các nguyên tắc:
- **Separation of Concerns**: Tách biệt DAO, Service, Repository
- **Repository Pattern**: Dễ dàng switch databases
- **Type Safety**: Full TypeScript support
- **Scalability**: Ready cho production databases (Neon, Supabase, Firebase, DynamoDB)

## 📁 Cấu Trúc Thư Mục

```
lib/
├── types/
│   └── user.ts                     # User model & interfaces
├── dao/
│   └── userDAO.ts                  # Data access object (localStorage)
├── services/
│   └── userService.ts              # Business logic layer
├── repositories/
│   └── userRepository.ts           # Repository pattern & interface
├── contexts/
│   └── AuthContext.tsx             # Global auth state
├── hooks/
│   └── useUser.ts                  # Custom React hooks
└── config/
    └── database.ts                 # Database config & factory

app/api/auth/ & app/api/users/     # API endpoints
```

## 🔐 Features

### Authentication
- ✅ User registration with validation
- ✅ User login with password verification
- ✅ Session management
- ✅ Token generation
- ✅ Logout functionality
- ✅ Password change

### Authorization
- ✅ Role-based access control (student, teacher, admin)
- ✅ User-specific data protection
- ✅ Admin operations

### Data Management
- ✅ CRUD operations for users
- ✅ Email uniqueness validation
- ✅ Profile updates
- ✅ Account deactivation

## 🚀 Quick Start

### 1. Use Authentication in Components

```typescript
'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { useUser } from '@/lib/hooks/useUser'

export function MyComponent() {
  const { user, isLoggedIn, login, logout } = useAuth()
  const { userName, isAdmin } = useUser()

  if (!isLoggedIn) {
    return <div>Please login</div>
  }

  return (
    <div>
      <h1>Welcome, {userName}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### 2. Handle Login/Register

```typescript
const { register, login, error } = useAuth()

// Register
try {
  await register({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    confirmPassword: 'password123'
  })
  // Redirect to dashboard
} catch (err) {
  console.error(error)
}

// Login
try {
  await login({
    email: 'john@example.com',
    password: 'password123'
  })
  // Redirect to quiz
} catch (err) {
  console.error(error)
}
```

### 3. Check Permissions

```typescript
import { useUserPermission } from '@/lib/hooks/useUser'

export function AdminPanel() {
  const { canAccessAdminPanel } = useUserPermission()

  if (!canAccessAdminPanel()) {
    return <div>Access Denied</div>
  }

  return <div>Admin Content</div>
}
```

## 🔄 Data Flow Architecture

```
┌─────────────────────┐
│   UI Components     │
│  (useAuth, useUser) │
└──────────┬──────────┘
           │
      (calls)
           │
           ▼
┌─────────────────────┐
│   AuthContext       │ (Global state management)
│   (React Context)   │
└──────────┬──────────┘
           │
      (calls)
           │
           ▼
┌─────────────────────┐
│   UserService       │ (Business logic)
│   (Services)        │
└──────────┬──────────┘
           │
      (calls)
           │
           ▼
┌─────────────────────┐
│   UserDAO / Repo    │ (Data access)
│   (DAO/Repository)  │
└──────────┬──────────┘
           │
      (uses)
           │
           ▼
┌─────────────────────┐
│   Data Storage      │ (Currently: localStorage)
│   (localStorage)    │ (Future: DB)
└─────────────────────┘
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### User Management
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/[id]` - Get user by ID
- `PATCH /api/users/[id]` - Update user profile
- `DELETE /api/users/[id]` - Delete user (admin only)

## 🗄️ Database Migration

### Current (Development)
- **Storage**: Browser localStorage
- **Data Persistence**: Client-side only
- **Security**: ⚠️ Basic (not for production)

### Migration to Production Database

**Step 1: Choose Database**
- Neon PostgreSQL (recommended with Drizzle)
- Supabase (managed PostgreSQL)
- Firebase (document-based)
- AWS DynamoDB (NoSQL)

**Step 2: Implement Repository**
```typescript
export class NeonUserRepository extends BaseUserRepository {
  async create(data: RegisterData): Promise<User> {
    // Using Drizzle ORM or sql library
    // INSERT INTO users (...) VALUES (...)
  }
  
  async findById(id: string): Promise<User | null> {
    // SELECT * FROM users WHERE id = $1
  }
  
  // ... implement other methods
}
```

**Step 3: Update Configuration**
```typescript
// lib/config/database.ts
export const DATABASE_TYPE = DatabaseType.NEON
```

**Step 4: Test & Deploy**

## 🔒 Security Considerations

### Current Limitations
- ⚠️ Password hashing uses `btoa()` (not secure)
- ⚠️ Token is a simple base64 encoded JSON
- ⚠️ No HTTPS/TLS enforcement
- ⚠️ No rate limiting
- ⚠️ Development only

### For Production
- [ ] Use bcrypt for password hashing
- [ ] Implement JWT with HS256 or RS256
- [ ] Enable HTTPS/TLS
- [ ] Add rate limiting
- [ ] Implement CSRF tokens
- [ ] Add input validation/sanitization
- [ ] Use parameterized queries (when using DB)
- [ ] Implement session expiration
- [ ] Add refresh token mechanism
- [ ] Setup monitoring & logging

## 📝 Example: Complete Login Flow

```typescript
// 1. User submits login form
const handleLogin = async (email: string, password: string) => {
  try {
    // 2. AuthContext calls userService.login()
    await login({ email, password })
    
    // 3. userService validates and calls userDAO.login()
    // 4. userDAO checks email exists, verifies password
    // 5. Password is verified using btoa() comparison
    // 6. Token is generated
    // 7. Session is saved to localStorage
    // 8. AuthContext state is updated
    
    // 9. Component redirects to dashboard
    navigate('/dashboard')
  } catch (error) {
    // 10. Error is displayed to user
    setError(error.message)
  }
}
```

## 🧪 Testing Examples

### Manual Testing
1. Open browser console
2. Register a new user
3. Login with credentials
4. Check localStorage for session
5. Refresh page - session persists
6. Logout - session cleared

### Automated Testing
```typescript
describe('User Authentication', () => {
  it('should register user with valid data', async () => {
    const result = await userService.register({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    })
    
    expect(result.user.email).toBe('test@example.com')
    expect(result.token).toBeDefined()
  })
  
  it('should login user with correct password', async () => {
    const result = await userService.login({
      email: 'test@example.com',
      password: 'password123'
    })
    
    expect(result.user).toBeDefined()
    expect(result.token).toBeDefined()
  })
})
```

## 📚 Additional Resources

- [Authentication Patterns](./lib/contexts/AuthContext.tsx)
- [Data Layer Architecture](./DATA_LAYER_ARCHITECTURE.md)
- [User Types Definition](./lib/types/user.ts)
- [Repository Pattern](./lib/repositories/userRepository.ts)

## 🤝 Contributing

When adding new features:
1. Add types in `lib/types/user.ts`
2. Implement in DAO/Repository
3. Add business logic in Service
4. Expose via hooks or Context
5. Create API endpoint if needed

## 📞 Support

For questions or issues:
1. Check the documentation files
2. Review examples in this file
3. Check API endpoint implementations
4. Review database configuration options
