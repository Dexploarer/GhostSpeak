# Advanced Type Patterns

## Table of Contents
- [satisfies Operator](#satisfies-operator)
- [as const Assertions](#as-const-assertions)
- [Template Literal Types](#template-literal-types)
- [Mapped Types](#mapped-types)
- [Conditional Types](#conditional-types)
- [Variadic Tuple Types](#variadic-tuple-types)
- [Type Guards](#type-guards)
- [Branded Types](#branded-types)

---

## satisfies Operator

Validates a value conforms to a type while preserving literal inference.

### Basic Usage

```typescript
// Without satisfies: loses literal types
const config: Config = {
  port: 3000,
  env: 'production',
};
// config.env is string

// With satisfies: preserves literals
const config = {
  port: 3000,
  env: 'production',
} satisfies Config;
// config.env is 'production'
```

### Property Name Constraining

```typescript
type ValidKeys = 'name' | 'age' | 'email';

const user = {
  name: 'Alice',
  age: 30,
  // email: 'a@b.com',  // Can be omitted
  // extra: true,       // Error: not in ValidKeys
} satisfies Partial<Record<ValidKeys, unknown>>;
```

### With Record Types

```typescript
type Route = { path: string; handler: () => void };

const routes = {
  home: { path: '/', handler: () => {} },
  about: { path: '/about', handler: () => {} },
} satisfies Record<string, Route>;

// routes.home is still narrowly typed
routes.home.path;  // '/'
```

### satisfies + as const

Combine for maximum type safety:

```typescript
const config = {
  apiUrl: 'https://api.example.com',
  retries: 3,
  features: ['auth', 'cache'],
} as const satisfies {
  apiUrl: string;
  retries: number;
  features: readonly string[];
};

// config.apiUrl is 'https://api.example.com' (literal)
// config.features is readonly ['auth', 'cache'] (tuple)
```

---

## as const Assertions

Creates deeply readonly literal types.

### Basic Patterns

```typescript
// Literal type
const status = 'active' as const;
// type: 'active', not string

// Readonly tuple
const coords = [10, 20] as const;
// type: readonly [10, 20], not number[]

// Deep readonly object
const config = {
  api: {
    url: 'https://api.com',
    timeout: 5000,
  },
  features: ['auth', 'cache'],
} as const;
// All properties deeply readonly with literal types
```

### Extracting Union from Array

```typescript
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = (typeof ROLES)[number];
// 'admin' | 'user' | 'guest'

// Validate at runtime
function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}
```

### Object Keys as Union

```typescript
const STATUS_CODES = {
  OK: 200,
  NOT_FOUND: 404,
  ERROR: 500,
} as const;

type StatusName = keyof typeof STATUS_CODES;
// 'OK' | 'NOT_FOUND' | 'ERROR'

type StatusCode = (typeof STATUS_CODES)[StatusName];
// 200 | 404 | 500
```

### Discriminated Unions

```typescript
const actions = {
  increment: { type: 'INCREMENT' },
  decrement: { type: 'DECREMENT' },
  reset: { type: 'RESET', payload: 0 },
} as const;

type Action = (typeof actions)[keyof typeof actions];
// { type: 'INCREMENT' } | { type: 'DECREMENT' } | { type: 'RESET'; payload: 0 }
```

---

## Template Literal Types

String manipulation at the type level.

### Basic Patterns

```typescript
// Simple concatenation
type Greeting = `Hello, ${string}`;
// Matches 'Hello, World', 'Hello, Alice', etc.

// Union expansion
type Size = 'sm' | 'md' | 'lg';
type Prefix = 'text' | 'padding';
type ClassName = `${Prefix}-${Size}`;
// 'text-sm' | 'text-md' | 'text-lg' | 'padding-sm' | ...
```

### Built-in String Utilities

```typescript
type Event = 'click' | 'hover';

type Upper = Uppercase<Event>;      // 'CLICK' | 'HOVER'
type Lower = Lowercase<'HELLO'>;    // 'hello'
type Cap = Capitalize<Event>;       // 'Click' | 'Hover'
type Uncap = Uncapitalize<'Hello'>; // 'hello'
```

### Event Handler Pattern

```typescript
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`;
// 'onClick' | 'onFocus' | 'onBlur'

type EventHandlers = {
  [K in EventName as `on${Capitalize<K>}`]: (event: Event) => void;
};
// { onClick: ..., onFocus: ..., onBlur: ... }
```

### String Parsing with infer

```typescript
// Extract parts
type ParseRoute<S> = S extends `/${infer First}/${infer Rest}`
  ? [First, ...ParseRoute<`/${Rest}`>]
  : S extends `/${infer Last}`
  ? [Last]
  : [];

type Route = ParseRoute<'/api/users/123'>;
// ['api', 'users', '123']

// Parse semver
type ParseVersion<S> = S extends `${infer Major}.${infer Minor}.${infer Patch}`
  ? { major: Major; minor: Minor; patch: Patch }
  : never;

type V = ParseVersion<'1.2.3'>;
// { major: '1'; minor: '2'; patch: '3' }
```

### API Route Types

```typescript
type Method = 'get' | 'post' | 'put' | 'delete';
type Resource = 'users' | 'posts' | 'comments';

type Endpoint = `/api/${Resource}`;
type FullRoute = `${Uppercase<Method>} ${Endpoint}`;
// 'GET /api/users' | 'POST /api/users' | ...
```

---

## Mapped Types

Transform existing types systematically.

### Basic Transformations

```typescript
// Make all optional
type Partial<T> = { [K in keyof T]?: T[K] };

// Make all required
type Required<T> = { [K in keyof T]-?: T[K] };

// Make all readonly
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// Make all mutable
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
```

### Key Remapping (as clause)

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  name: string;
  age: number;
}

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

### Filtering Keys

```typescript
// Keep only string properties
type StringProps<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Mixed {
  name: string;
  age: number;
  email: string;
}

type OnlyStrings = StringProps<Mixed>;
// { name: string; email: string }
```

### Deep Transformations

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>
    : T[K];
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? DeepPartial<T[K]>
    : T[K];
};
```

---

## Conditional Types

Type-level if/else logic.

### Basic Pattern

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>;  // true
type B = IsString<42>;       // false
```

### Extracting with infer

```typescript
// Get return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Get promise value
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// Get array element
type ElementOf<T> = T extends (infer E)[] ? E : never;

// Get first parameter
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any
  ? F
  : never;
```

### Distributive Conditionals

```typescript
// Distributes over unions
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>;
// string[] | number[]

// Prevent distribution with tuple
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type Result2 = ToArrayNonDist<string | number>;
// (string | number)[]
```

### Recursive Types

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Flatten nested arrays
type Flatten<T> = T extends (infer U)[]
  ? Flatten<U>
  : T;

type Deep = Flatten<number[][][]>;  // number
```

---

## Variadic Tuple Types

Work with tuple types of varying lengths.

### Spread in Tuples

```typescript
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];

type Result = Concat<[1, 2], [3, 4]>;
// [1, 2, 3, 4]
```

### Function Parameter Manipulation

```typescript
// Prepend parameter
type Prepend<T, Params extends unknown[]> = (
  first: T,
  ...rest: Params
) => void;

type Original = (a: string, b: number) => void;
type WithId = Prepend<number, Parameters<Original>>;
// (first: number, a: string, b: number) => void
```

### Tuple Operations

```typescript
// First element
type First<T extends unknown[]> = T extends [infer F, ...unknown[]]
  ? F
  : never;

// Last element
type Last<T extends unknown[]> = T extends [...unknown[], infer L]
  ? L
  : never;

// Remove first
type Tail<T extends unknown[]> = T extends [unknown, ...infer Rest]
  ? Rest
  : never;

// Remove last
type Init<T extends unknown[]> = T extends [...infer Rest, unknown]
  ? Rest
  : never;
```

---

## Type Guards

Runtime narrowing with type safety.

### User-Defined Type Guards

```typescript
interface Dog { bark(): void; }
interface Cat { meow(): void; }

function isDog(pet: Dog | Cat): pet is Dog {
  return 'bark' in pet;
}

function handlePet(pet: Dog | Cat) {
  if (isDog(pet)) {
    pet.bark();  // Narrowed to Dog
  } else {
    pet.meow();  // Narrowed to Cat
  }
}
```

### Assertion Functions

```typescript
function assertDefined<T>(
  value: T,
  message?: string
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is not defined');
  }
}

function process(input: string | null) {
  assertDefined(input);
  // input is string here
  console.log(input.toUpperCase());
}
```

### Inferred Type Guards (TS 5.5+)

```typescript
// TypeScript infers the type predicate
function isNonNull<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

// Also works with array filter
const mixed = [1, null, 2, undefined, 3];
const numbers = mixed.filter(isNonNull);
// number[]
```

---

## Branded Types

Create distinct types from primitives.

### Basic Pattern

```typescript
type Brand<T, B> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type PostId = Brand<string, 'PostId'>;

function getUser(id: UserId) { /* ... */ }
function getPost(id: PostId) { /* ... */ }

const userId = 'user_123' as UserId;
const postId = 'post_456' as PostId;

getUser(userId);  // OK
getUser(postId);  // Error: PostId not assignable to UserId
```

### Validated Types

```typescript
type Email = Brand<string, 'Email'>;
type PositiveInt = Brand<number, 'PositiveInt'>;

function validateEmail(input: string): Email | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input) ? (input as Email) : null;
}

function validatePositiveInt(input: number): PositiveInt | null {
  return Number.isInteger(input) && input > 0
    ? (input as PositiveInt)
    : null;
}
```

### With Zod

```typescript
import { z } from 'zod';

const EmailSchema = z.string().email().brand<'Email'>();
type Email = z.infer<typeof EmailSchema>;

const email = EmailSchema.parse('user@example.com');
// email is branded Email type
```
