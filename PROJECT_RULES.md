# SPOT Engineering - Project Rules & Technology Version Matrix

**Document Version**: 1.0.0-STABLE  
**Project**: SPOT (Sport Pitch Online Ticketing Platform)  
**Author / Tech Lead**: Nguyễn Thanh Tùng (24127583)  
**Target Team**: Group 09 (HCMUS Software Engineering Dept)  

---

## 1. Universal Technology Stack & Version Lock Matrix

To prevent version drift, dependency conflicts, and "works on my machine" issues, all team members MUST use the exact tool and library versions specified below.

### 1.1. Core Runtime Environment & Tools
| Technology / Tool | Version Lock | Installation / Enforcement |
| :--- | :--- | :--- |
| **Node.js** | **`v20.17.0` (LTS Active)** | Enforced via `.nvmrc` (`nvm use`) |
| **Package Manager** | **`pnpm@9.7.0`** (or `npm@10.8.2`) | Enforced via `package.json` `packageManager` field |
| **Python** | **`3.11.9`** | Enforced via `.python-version` |
| **TypeScript** | **`v5.5.4`** | Monorepo root `devDependencies` |
| **Docker Engine** | **`v26.x` / Compose `v2.27.x`** | Defined in `infrastructure/docker/` |
| **PostgreSQL** | **`v16.3`** | Official PostgreSQL 16 Alpine Docker container |
| **Redis** | **`v7.2.5`** | Official Redis 7 Alpine Docker container |

---

### 1.2. Client Tier Dependencies (`apps/web-client` & `apps/admin-portal`)
| Package Name | Locked Version | Description & Usage |
| :--- | :--- | :--- |
| **`next`** | **`14.2.5`** | React Framework (App Router enabled) |
| **`react` / `react-dom`** | **`18.3.1`** | Core React UI runtime |
| **`tailwindcss`** | **`3.4.7`** | Utility-first CSS framework |
| **`lucide-react`** | **`0.417.0`** | Modern UI icon library |
| **`framer-motion`** | **`11.3.19`** | Micro-animations and page transition effects |
| **`@tanstack/react-query`**| **`5.51.15`** | Server-state management and API caching |
| **`zustand`** | **`4.5.4`** | Client-state management (Cart, Lock Timer countdown) |
| **`react-hook-form`** | **`7.52.1`** | High-performance form handling |
| **`zod`** | **`3.23.8`** | Type-safe schema validation |

---

### 1.3. Mobile App Dependencies (`apps/mobile-app`)
| Package Name | Locked Version | Description & Usage |
| :--- | :--- | :--- |
| **`expo`** | **`~51.0.22`** | Cross-platform React Native framework |
| **`react-native`** | **`0.74.3`** | Mobile UI runtime |
| **`@react-navigation/native`**| **`6.1.18`** | Screen stack & tab navigation |

---

### 1.4. Backend Gateway & Core Services (`services/api-gateway` & `services/core-api`)
| Package Name | Locked Version | Description & Usage |
| :--- | :--- | :--- |
| **`express`** | **`4.19.2`** | Node.js web server framework |
| **`jsonwebtoken`** | **`9.0.2`** | RS256 JWT authentication |
| **`argon2`** | **`0.40.3`** | OWASP-recommended password hashing |
| **`express-rate-limit`** | **`7.3.1`** | Token-bucket rate limiting against DDoS |
| **`helmet`** | **`7.1.0`** | HTTP Security header hardening |
| **`pg`** | **`8.12.0`** | PostgreSQL client driver |
| **`@prisma/client` / `prisma`**| **`5.17.0`** | ORM for PostgreSQL 7 Logical Schemas |
| **`ioredis`** | **`5.4.1`** | High-speed Redis client driver |
| **`redlock`** | **`5.0.0-beta.2`** | Ephemeral 5-minute Redis slot locking |
| **`winston`** | **`3.13.1`** | Structured JSON logging |

---

### 1.5. AI Microservices Dependencies (`services/ai-services/requirements.txt`)
| Python Package | Locked Version | Purpose |
| :--- | :--- | :--- |
| **`fastapi`** | **`0.111.1`** | High-performance ASGI Python framework |
| **`uvicorn[standard]`** | **`0.30.1`** | Production ASGI server |
| **`xgboost`** | **`2.1.0`** | Gradient boosting for Smart No-Show Prediction |
| **`scikit-learn`** | **`1.5.1`** | Collaborative Filtering Recommendation Engine |
| **`google-generativeai`** | **`0.7.2`** | Gemini LLM SDK for Voice Booking NLP Assistant |
| **`pandas` / `numpy`** | **`2.2.2` / `1.26.4`** | Data preprocessing & matrix manipulation |
| **`psycopg2-binary`** | **`2.9.9`** | PostgreSQL database connector |
| **`redis`** | **`5.0.8`** | Redis cache connector |

---

## 2. Architecture & Workspace Boundary Rules

1. **Strict Monorepo Boundary Isolation**:
   - `apps/*` CANNOT import directly from other `apps/*`.
   - `services/*` MUST communicate with each other via HTTP REST or message broker. Direct cross-service code imports are FORBIDDEN.
   - Shared logic MUST be placed inside `packages/*` (`packages/database`, `packages/redis-client`, `packages/shared-types`, `packages/ui-components`).

2. **Database Boundary & Schema Scoping Rules**:
   - PostgreSQL queries MUST specify explicit schema names (e.g. `schema_auth.users`, `schema_booking.bookings`).
   - No microservice may perform raw SQL mutations on tables outside its owned logical schema.

3. **Zero Double-Booking Ephemeral Locking Rule**:
   - Any booking slot reservation MUST acquire the Redis lock `slot:lock:{field_id}:{date}:{start_time}` (TTL: `300` seconds) BEFORE initiating a database transaction.
   - Direct PostgreSQL booking inserts without an active Redis lock token are REJECTED.

4. **Security & Data Privacy Rules**:
   - Passwords MUST be hashed using `argon2id`. Plaintext or MD5/SHA1 hashing is FORBIDDEN.
   - JWT tokens MUST be signed with **RS256** asymmetric keys.
   - Accounts MUST lock automatically for 15 minutes after **5 consecutive failed login attempts**.
   - Sensitive actions (changing email, phone number) MUST require OTP re-confirmation.

---

## 3. Code Style, Linting & Git Conventions

1. **Coding Style Standards**:
   - **TypeScript/JS**: ESLint Airbnb config, Prettier formatting (2 spaces, single quotes, trailing commas).
   - **Python**: PEP8 compliance enforced via `black` (line length 88) and `isort`.
   - **Naming Conventions**:
     - Variables & Functions: `camelCase` (`lockSlot`, `calculateFee`)
     - Classes & Interfaces: `PascalCase` (`SlotLockManager`, `UserResponse`)
     - Constants: `UPPER_SNAKE_CASE` (`DEFAULT_LOCK_TTL_SECONDS = 300`)
     - Database Tables & Columns: `snake_case` (`booking_date`, `total_amount`)

2. **Git Flow & Branching Rules**:
   - Direct commits to `main` or `develop` are BLOCKED.
   - Branch naming: `feature/<dri-name>/<feature-name>` (e.g. `feature/cuong/auth-otp`, `feature/khoa/redis-lock`).
   - Commit Message format: `<type>(<scope>): <description>` (e.g. `feat(booking): implement 5-min Redis slot lock TTL`).

3. **Pull Request & Review SLA**:
   - Every PR requires $\ge 1$ approval from the module DRI or Tech Lead.
   - SLA for code review: **Within 24 hours**.
   - Automated CI checks (Linter, Unit Tests) MUST pass 100%.

---

## 4. Team DRI Responsibility Quick Reference

| Member Name | Role | Primary Folder Boundaries |
| :--- | :--- | :--- |
| **Nguyễn Thanh Tùng** | Tech Lead & Architect | `services/api-gateway/`, `services/ai-services/`, Root Architecture Specs |
| **Nguyễn Thái Cường** | Security Lead | `services/core-api/src/modules/auth/`, `packages/database/schemas/schema_auth.sql` |
| **Đỗ Trương Khoa** | Core Backend Engineer | `services/core-api/src/modules/booking/`, `social/`, `referee/`, `packages/redis-client/` |
| **K’Vớn** | Frontend & UX Lead | `apps/web-client/`, `apps/admin-portal/`, `apps/mobile-app/`, `packages/ui-components/` |
| **Đào Hoàng Phúc** | Database & Infra Lead | `packages/database/`, `infrastructure/docker/`, `infrastructure/scripts/` |
