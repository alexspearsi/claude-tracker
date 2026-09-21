---
last_mapped_commit: 7bdd32cff1b9829a6507c35f437d7e395a9906a3
last_mapped_at: 2026-09-20
---
# Testing Patterns

**Analysis Date:** 2026-09-20

## Test Framework

**Status:** Not configured

**Current State:**

- **No tests exist in this codebase** — no `.test.ts`, `.spec.ts`, or test files found
- **No test runner configured** — no `jest.config`, `vitest.config`, or test scripts
- **Testing dependency installed but unused:** `@nestjs/testing` 12.0.1 in `apps/api/package.json` dev dependencies

**Why:**
Per `CLAUDE.md`: "Тестов в проекте нет — раннер не настроен" (Tests don't exist — runner not configured)

## When Tests Are Needed

**For feature branches, follow this pattern:**

### Suggested Test Runner Setup

If tests are added in the future, recommend:

- **Backend**: Jest (industry standard for Node/Nest projects)
  - Install: `npm install --save-dev jest @types/jest ts-jest @nestjs/testing`
  - Place tests co-located: `apps/api/src/**/*.spec.ts`
  - Config: Nest provides `nest g resource` with test generation

- **Frontend**: Vitest or Jest
  - Install: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom`
  - Place tests: `apps/web/src/**/*.test.tsx`

### Test File Naming Convention

Following established patterns in similar codebases:

- Backend: `*.spec.ts` (Nest convention)
- Frontend: `*.test.tsx` or `*.test.ts`
- Co-locate with source files for easy modification discovery

## Backend Testing Patterns (When Implemented)

Based on Nest 12 and `@nestjs/testing` availability, tests should follow:

### Module Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, PrismaService],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should find all categories for user', async () => {
    const userId = 'test-user-id';
    // Mock prisma.category.findMany
    jest.spyOn(prisma.category, 'findMany').mockResolvedValue([...]);
    
    const result = await service.findAll(userId);
    
    expect(result).toBeDefined();
  });
});
```

### What Should Be Tested (Backend)

**Services:**

- Happy path: successful category creation, retrieval, update, deletion
- Error paths: user not found (404), duplicate name (409), foreign key violation (409)
- Data isolation: user A cannot see/modify user B's categories

**Controllers:**

- HTTP status codes: 200 for GET/PATCH, 201 for POST, 204 for DELETE
- Auth guard: protected routes reject requests without valid JWT
- @Public() routes: auth endpoints accessible without JWT

**Error Handling:**

- Prisma errors convert to correct HTTP exceptions
- Invalid DTOs rejected by ValidationPipe
- API response format: `{ statusCode, path, timestamp, error }`

### What NOT to Test (Backend)

- Prisma client internals (already tested by Prisma team)
- External service calls (mock them)
- Simple data transformation functions at 100% coverage (use 80-90% rule)

## Frontend Testing Patterns (When Implemented)

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { CategoryDot } from './category-dot';

describe('CategoryDot', () => {
  it('renders with correct color', () => {
    render(<CategoryDot color="#FF0000" />);
    
    const dot = screen.getByRole('img', { hidden: true }); // aria-hidden
    expect(dot).toHaveStyle({ backgroundColor: '#FF0000' });
  });

  it('applies custom className', () => {
    render(<CategoryDot color="#FF0000" className="custom" />);
    
    const dot = screen.getByRole('img', { hidden: true });
    expect(dot).toHaveClass('custom');
  });
});
```

### Server Action Testing

```typescript
import { loginAction } from '@/features/auth/api/login.action';

describe('loginAction', () => {
  it('returns error on invalid credentials', async () => {
    const result = await loginAction({ email: 'test@example.com', password: 'wrong' });
    
    expect(result?.error).toBeDefined();
  });

  it('redirects on successful login', async () => {
    const result = await loginAction({ email: 'valid@example.com', password: 'correct' });
    
    // Server action calls redirect() which throws NEXT_REDIRECT
    expect(result).toBeUndefined(); // or check redirect call
  });
});
```

### What Should Be Tested (Frontend)

**Components:**

- Rendering with props
- Event handlers (button clicks, form submissions)
- Conditional rendering (empty state vs. content)
- Error/loading states in async operations

**Forms:**

- Validation with zodResolver
- Field error messages displayed
- Submit handler calls action with correct data
- Loading state while submitting

**API/Integration:**

- apiErrorMessage() correctly extracts error from API response
- apiErrorMessage() shows fallback message on network errors
- apiFetch() adds Authorization header when accessToken provided

### What NOT to Test (Frontend)

- Tailwind CSS class names (use Playwright e2e for visual regression)
- Third-party component internals (shadcn/ui)
- React hooks behavior (already tested by React team)
- Page routing (use Playwright e2e tests instead)

## Test Data & Mocking

### Fixtures (When Needed)

Create test data factories in `apps/api/src/__tests__/fixtures/`:

```typescript
export function createTestCategory(overrides?: Partial<Category>): Category {
  return {
    id: 'test-id-123',
    name: 'Test Category',
    color: '#000000',
    icon: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
```

### Mocking Strategy

**Backend:**

- Mock Prisma client: `jest.spyOn(prisma.category, 'create').mockResolvedValue(...)`
- Mock external services: Mock HTTP clients, message queues
- Mock JWT validation: Use `@nestjs/testing` utilities to skip auth for unit tests

**Frontend:**

- Mock `apiFetch`: Use MSW (Mock Service Worker) for realistic API mocking
- Mock `useRouter`: Jest mock for Next.js router
- Don't mock component internals; test through public interface

## Running Tests

When tests are configured, run:

```bash

# Run all tests

npm test

# Run tests in watch mode

npm test -- --watch

# Run tests with coverage

npm test -- --coverage

# Run tests in specific package

npm test -w apps/api
npm test -w apps/web
```

## Coverage Goals

When tests are added:

- **Minimum target:** 70% overall coverage
- **Services/controllers:** 80%+ (these are critical)
- **Utilities/helpers:** 90%+ (small, pure functions)
- **UI components:** 60%+ (harder to test, less critical than logic)

View coverage report:

```bash
npm test -- --coverage
```

## Known Limitations

**Backend:**

- No easy way to test Prisma query optimization without hitting real database
- Driver adapter (`@prisma/adapter-pg`) adds complexity to unit testing — may need integration tests with Docker container

**Frontend:**

- Server Actions require special handling in tests (they throw redirects)
- `'use server'` directive prevents running code in test environment — will need integration tests with Node environment

---

*Testing analysis: 2026-09-20*
