# API Reference — JWT & FE Integration

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 13. JWT & FE integration

### Claims

| Token | Claims | TTL mặc định |
| :--- | :--- | :--- |
| Access | `sub` (userId), `role`, `email`, `type: "access"` | `15m` (`JWT_EXPIRY`) |
| Refresh | `sub`, `role`, `type: "refresh"` | `7d` (`JWT_REFRESH_EXPIRY`) |

### Gợi ý Axios / fetch

```ts
// baseURL ví dụ
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Gắn access token cho mọi request:
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // từ store
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Khi 401: gọi POST /auth/refresh rồi retry (một lần)
```

### Object `user` (public)

| Field | Type | Ý nghĩa |
| :--- | :--- | :--- |
| `userId` | string/number | ID |
| `email` | string | |
| `fullName` | string | |
| `phoneNumber` | string | |
| `role` | string | `PLAYER` / `OWNER` / `REFEREE` / … |
| `status` | string | `ACTIVE` / `PENDING` / `LOCKED` |
| `gender` | string? | |
| `avatarUrl` | string \| null | URL ảnh; chưa có upload BE |
| `language` | `en` \| `vi` | default `en` |
| `appearance` | `light` \| `dark` \| `system` | default `light` |
| `pushNotificationsEnabled` | boolean | default `true` |
| `locationServicesEnabled` | boolean | default `true` |
| `roleSelected` | boolean | |
| `roleSelectedAt` | string \| null | ISO datetime |
| `emailVerified` | boolean | |
| `createdAt` | string | |
| `skills` | object | `{ badminton, football }` — code hoặc `null` |

`GET /users/:id` dùng shape **host profile** (6.10): không `email`/`phoneNumber`/`role`/`status`/`gender`; có `matchCount`, `joinedMatches`, `rating`/`reviewCount` live từ pickup kèo reviews.

