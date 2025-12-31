# Package Migration Guide for GhostSpeak

This guide covers the migration steps for major package upgrades in the GhostSpeak project.

---

## 1. Recharts: 2.12.7 → 3.6.0

**Risk Level**: **HIGH**

### Breaking Changes

1. **State Management Rewrite**
   - `CategoricalChartState` has been removed from event handlers and the `Customized` component
   - All scale utilities are now maintained within recharts (no external dependencies)

2. **Dependency Removals**
   - Removed `recharts-scale` dependency - use `getNiceTickValues` directly from recharts
   - Removed `react-smooth` dependency - all animations are now internal

3. **Component API Changes**
   - `activeIndex` prop removed - use `Tooltip` examples instead
   - `alwaysShow` prop removed from Reference components (deprecated)
   - `isFront` prop removed from reference elements (non-functional since v2)
   - `ref.current.current` removed from `ResponsiveContainer`

4. **Accessibility Changes**
   - `accessibilityLayer` prop is now `true` by default (was `false` in v2)
   - Pass `accessibilityLayer={false}` to disable
   - Keyboard events no longer passed through in `onMouseMove` callback

5. **Behavior Changes**
   - Y domain now calculated correctly with nullish `ErrorBar` values
   - Legend order default may have changed (no specific order promised)

### New Features

- Support for custom components without `Customized` wrapper
- `Tooltip` now supports a `portal` prop for flexible rendering
- Z-index support across most recharts surfaces

### Migration Steps

1. **Update dependency**:
   ```bash
   bun install recharts@^3.6.0
   ```

2. **Remove `recharts-scale` imports**:
   ```typescript
   // Before
   import { getNiceTickValues } from 'recharts-scale';

   // After
   import { getNiceTickValues } from 'recharts';
   ```

3. **Update accessibility settings** (if needed):
   ```tsx
   // If you want to disable a11y (not recommended)
   <ResponsiveContainer accessibilityLayer={false}>
   ```

4. **Remove deprecated props**:
   - Replace `activeIndex` usage with `Tooltip` configuration
   - Remove `alwaysShow` from Reference components
   - Remove `isFront` from reference elements

5. **Test all charts** thoroughly for layout and interaction changes

### Code Examples

**Before (v2)**:
```tsx
import { getNiceTickValues } from 'recharts-scale';

<LineChart>
  <ReferenceLine alwaysShow={true} />
  <Tooltip activeIndex={0} />
</LineChart>
```

**After (v3)**:
```tsx
import { getNiceTickValues } from 'recharts';

<LineChart>
  <ReferenceLine />
  <Tooltip />
</LineChart>
```

**References**:
- [Official 3.0 Migration Guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)

---

## 2. Date-fns: 3.6.0 → 4.1.0

**Risk Level**: **LOW**

### Breaking Changes

1. **Package Structure**
   - Now ESM-first with `"type": "module"` in package.json
   - Uses `.cjs` instead of `.mjs` extensions
   - Should not affect normal usage

2. **TypeScript Type Changes**
   - `getDay` now returns `0|1|2|3|4|5|6` instead of `number`
   - Some function generics changed (rare edge cases only)

3. **Locale Functions**
   - Locales now use regular functions instead of UTC versions
   - Should not break code unless using locales directly

### New Features

- **First-class time zone support** (most requested feature!)
- Improved TypeScript types for better type safety

### Migration Steps

1. **Update dependency**:
   ```bash
   bun install date-fns@^4.1.0
   ```

2. **Fix TypeScript errors** (if any):
   - Most fixes will be trivial if TypeScript complains
   - Check `getDay` usage if you rely on specific number types

3. **Test date formatting and parsing** across the application

4. **Consider using new time zone features**:
   ```typescript
   import { formatInTimeZone } from 'date-fns-tz';
   ```

### Code Examples

No major code changes required for typical usage. The migration is mostly transparent.

**References**:
- [v4.0 Release Announcement](https://blog.date-fns.org/v40-with-time-zone-support/)
- [Official Changelog](https://github.com/date-fns/date-fns/blob/main/CHANGELOG.md)

---

## 3. Husky: 8.0.0 → 9.1.7

**Risk Level**: **MEDIUM**

### Breaking Changes

1. **`husky add` Command Removed**
   - Can no longer use `npx husky add .husky/commit-msg 'npx commitlint --edit $1'`
   - Must manually create hook files in `.husky/` directory

2. **Manual Hook File Creation**
   - No automatic shebang lines added
   - Must ensure scripts start with appropriate shebang (e.g., `#!/usr/bin/env sh`)

3. **CommonJS to ESM Transition**
   - Change `require('husky')` to `import('husky')`

4. **Package.json Cleanup**
   - Remove deprecated configurations from package.json

### New Features

- Performance improvements
- Smaller footprint
- Improved reliability
- Backward compatible with v8 (can migrate incrementally)

### Migration Steps

1. **Update dependency**:
   ```bash
   bun install husky@^9.1.7
   ```

2. **Update hook files** in `.husky/`:
   ```bash
   # Ensure each hook file starts with shebang
   #!/usr/bin/env sh
   ```

3. **Update package.json scripts**:
   ```json
   {
     "scripts": {
       "prepare": "husky"
     }
   }
   ```

4. **Manually create new hooks** (instead of `husky add`):
   ```bash
   # Create hook file manually
   echo '#!/usr/bin/env sh
   npx commitlint --edit $1' > .husky/commit-msg
   chmod +x .husky/commit-msg
   ```

5. **Update any programmatic usage**:
   ```javascript
   // Before
   const husky = require('husky');

   // After
   const husky = await import('husky');
   ```

### Code Examples

**Before (v8)**:
```bash
npx husky add .husky/pre-commit "npm test"
```

**After (v9)**:
```bash
# Manually create .husky/pre-commit
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
npm test
EOF
chmod +x .husky/pre-commit
```

**References**:
- [How to Migrate from Husky 8 to 9](https://remarkablemark.org/blog/2024/02/04/how-to-migrate-from-husky-8-to-9/)

---

## 4. @hookform/resolvers: 3.3.4 → 5.2.2

**Risk Level**: **MEDIUM**

### Breaking Changes

1. **React Hook Form Version Requirement**
   - Requires `react-hook-form@7.55.0` or higher

2. **TypeScript Type Changes - Input/Output Separation**
   - New three-generic pattern: `useForm<Input, Context, Output>()`
   - Supports distinct input and output types with transformations (e.g., Zod)

3. **Resolver Type Signature Changes**
   - Type signature updated to support new generic pattern
   - May cause TypeScript errors with schemas using transformations

4. **Yup Resolver Changes** (from v3.0.0)
   - Requires Yup v1
   - `rawValues` option renamed to `raw`
   - `classValidationResolver` schema options structure changed

### New Features

- Better type inference from schemas
- Support for transformation types (Input → Output)
- Improved TypeScript developer experience

### Migration Steps

1. **Update dependencies**:
   ```bash
   bun install @hookform/resolvers@^5.2.2 react-hook-form@^7.55.0
   ```

2. **Let schemas infer types** (recommended approach):
   ```typescript
   // Before
   const { control } = useForm<FormValues>();

   // After - let schema infer types
   const schema = z.object({
     email: z.string().email(),
     age: z.string().transform(Number),
   });

   const { control } = useForm({
     resolver: zodResolver(schema),
   });
   // Types are automatically inferred!
   ```

3. **If extending plugin API**, import new types:
   ```typescript
   import type { Plugin } from 'vite';
   import type { ViteReactPluginApi } from '@vitejs/plugin-react';

   export const somePlugin: Plugin = {
     name: 'some-plugin',
     api: {
       reactBabel: (babelConfig) => {
         babelConfig.plugins.push('some-babel-plugin');
       },
     } satisfies ViteReactPluginApi,
   };
   ```

4. **Update Yup schemas** (if applicable):
   ```typescript
   // Before
   schemaOptions: { rawValues: true }

   // After
   schemaOptions: { raw: true }
   ```

### Code Examples

**Before (v3)**:
```typescript
const { control } = useForm<FormInputs>({
  resolver: zodResolver(schema),
});
```

**After (v5)**:
```typescript
// Option 1: Let schema infer (recommended)
const schema = z.object({
  email: z.string().email(),
});

const { control } = useForm({
  resolver: zodResolver(schema),
});

// Option 2: Explicit types (for complex cases)
const { control } = useForm<InputType, Context, OutputType>({
  resolver: zodResolver(schema),
});
```

**References**:
- [GitHub Releases](https://github.com/react-hook-form/resolvers/releases)

---

## 5. @types/node: 24.1.0 → 25.0.3

**Risk Level**: **LOW**

### Breaking Changes

1. **ES2022 `.at()` Method Polyfills Removed**
   - Ensure TypeScript `target` lib includes ES2022
   - No longer provided by `@types/node`

2. **Iterator Return Types**
   - Iterator return type changed to `undefined`
   - No Node API iterator returns a value
   - Changed for backward compatibility with `IterableIterator`

### Important Context

- `@types/*` packages do not follow SemVer
- Breaking changes may occur at any time
- Version should match your Node.js major version
- No formal changelog maintained by DefinitelyTyped

### Migration Steps

1. **Update dependency**:
   ```bash
   bun install -D @types/node@^25.0.3
   ```

2. **Ensure TypeScript config includes ES2022**:
   ```json
   {
     "compilerOptions": {
       "lib": ["ES2022", "DOM"],
       "target": "ES2022"
     }
   }
   ```

3. **Fix any TypeScript errors** that arise:
   - Most should be minor type adjustments
   - Iterator-related code may need review

4. **Test the build** to ensure no type errors

### Code Examples

**tsconfig.json update**:
```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**References**:
- [DefinitelyTyped Repository](https://github.com/DefinitelyTyped/DefinitelyTyped)
- [Node.js Changelog](https://github.com/nodejs/node/blob/main/CHANGELOG.md)

---

## 6. Sonner: 1.5.0 → 2.0.7

**Risk Level**: **MEDIUM**

### Breaking Changes

1. **`unstyled` Prop Removed**
   - Use headless/custom toast method instead
   - Provides no default styles and full control of JSX

2. **Data Attribute Renamed**
   - `data-theme` renamed to `data-sonner-theme`

3. **Visual and Interaction Updates**
   - Removed lift interaction
   - Decreased default gap between toasts
   - Improved horizontal swiping

### New Features

- Enhanced rich colors and base colors
- Better toast removal in React strict mode
- Improved headless/custom toast support

### Migration Steps

1. **Update dependency**:
   ```bash
   bun install sonner@^2.0.7
   ```

2. **Replace `unstyled` prop**:
   ```tsx
   // Before
   <Toaster unstyled />

   // After - use headless approach
   <Toaster
     toastOptions={{
       unstyled: true,
       classNames: {
         toast: 'your-custom-class',
       },
     }}
   />
   ```

3. **Update data attribute selectors**:
   ```css
   /* Before */
   [data-theme="dark"] { }

   /* After */
   [data-sonner-theme="dark"] { }
   ```

4. **Test toast interactions**:
   - Verify swipe behavior
   - Check toast spacing
   - Test in React strict mode

### Code Examples

**Before (v1.5)**:
```tsx
import { Toaster } from 'sonner';

<Toaster unstyled />
```

**After (v2.0)**:
```tsx
import { Toaster } from 'sonner';

<Toaster
  toastOptions={{
    classNames: {
      toast: 'bg-white dark:bg-gray-800',
      title: 'text-gray-900 dark:text-gray-100',
      description: 'text-gray-700 dark:text-gray-300',
    },
  }}
/>
```

**References**:
- [Sonner Styling Documentation](https://sonner.emilkowal.ski/styling)
- [GitHub Releases](https://github.com/emilkowalski/sonner/releases)

---

## 7. jsdom: 26.1.0 → 27.4.0

**Risk Level**: **MEDIUM**

### Breaking Changes

1. **Node.js Version Requirements**
   - Minimum: Node.js v20.19.0+, v22.12.0+, or v24.0.0+
   - Previous minimum: v20.0.0
   - If you need earlier versions, stick with v26.1.0

2. **Secure Contexts for Localhost**
   - URLs like `http://localhost/` now considered secure contexts
   - Will return Secure-flagged cookies (per spec)
   - Due to upgraded `tough-cookie` dependency

3. **User Agent Stylesheet Source Changed**
   - Now derived from HTML Standard instead of Chromium
   - May change `getComputedStyle()` results

4. **`<input>` Pattern Attribute**
   - Now uses `v` regular expression flag instead of `u`

### New Features

- Updated to match latest HTML Standard
- Various CSS parsing fixes via `cssstyle` upgrade
- Fixed CSS system colors and keywords resolution

### Migration Steps

1. **Ensure Node.js version meets requirements**:
   ```bash
   node --version  # Should be v20.19.0+, v22.12.0+, or v24.0.0+
   ```

2. **Update dependency**:
   ```bash
   bun install -D jsdom@^27.4.0
   ```

3. **Update cookie handling** (if using localhost):
   ```javascript
   // Secure-flagged cookies now returned for http://localhost/
   // Ensure your tests account for this behavior
   ```

4. **Review `getComputedStyle()` usage**:
   - Test any code relying on computed styles
   - May need adjustments due to new user agent stylesheet

5. **Test input validation**:
   - Check `<input pattern="">` validation
   - Ensure regex patterns work with `v` flag

### Code Examples

**Cookie behavior change**:
```javascript
// Before (v26): Secure cookies NOT returned for http://localhost/
// After (v27): Secure cookies ARE returned for http://localhost/

// Update tests accordingly
const cookies = document.cookie;
// May now include Secure-flagged cookies when testing locally
```

**References**:
- [jsdom Changelog](https://github.com/jsdom/jsdom/blob/main/Changelog.md)
- [GitHub Releases](https://github.com/jsdom/jsdom/releases)

---

## 8. @vitejs/plugin-react: 4.7.0 → 5.1.2

**Risk Level**: **LOW**

### Breaking Changes

1. **Type System Changes**
   - Removed generic parameter on `Plugin` type
   - Prevents type errors with Rollup 4/Vite 5 when `skipLibCheck: false`

2. **API Extension Type Changes**
   - If extending React plugin via API object, import `ViteReactPluginApi` type

### Context: Vite 5 Requirements

- Node.js 18/20+ required (dropped support for 14/16/17/19)
- Compatible with any combination of React plugin and Vite core versions

### Migration Steps

1. **Update dependencies**:
   ```bash
   bun install -D @vitejs/plugin-react@^5.1.2 vite@^5.0.0
   ```

2. **Update plugin extensions** (if applicable):
   ```typescript
   import type { Plugin } from 'vite';
   import type { ViteReactPluginApi } from '@vitejs/plugin-react';

   export const somePlugin: Plugin = {
     name: 'some-plugin',
     api: {
       reactBabel: (babelConfig) => {
         babelConfig.plugins.push('some-babel-plugin');
       },
     } satisfies ViteReactPluginApi,
   };
   ```

3. **Verify TypeScript compilation**:
   ```bash
   bun run typecheck
   ```

### Code Examples

**Before (v4)**:
```typescript
import type { Plugin } from 'vite';

export const customPlugin: Plugin = {
  name: 'custom',
  api: {
    reactBabel: (config) => { /* ... */ }
  }
};
```

**After (v5)**:
```typescript
import type { Plugin } from 'vite';
import type { ViteReactPluginApi } from '@vitejs/plugin-react';

export const customPlugin: Plugin = {
  name: 'custom',
  api: {
    reactBabel: (config) => { /* ... */ }
  } satisfies ViteReactPluginApi,
};
```

**References**:
- [Vite Plugin React Changelog](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md)
- [Vite 5 Migration Guide](https://v5.vite.dev/guide/migration)

---

## 9. Lucide-react: 0.541.0 → 0.562.0

**Risk Level**: **LOW**

### Breaking Changes

None in this version range.

### New Features and Fixes

1. **New Icon**
   - Added `toolbox` icon

2. **Bug Fixes**
   - Changed `paint-bucket` icon design
   - Fixed and unified `color-picker` font-size
   - Fixed `className` prop handling for React Native Web
   - Removed icons namespace export to enable tree-shaking in `lucide-react-native`

3. **Performance Improvements**
   - Better tree-shaking support
   - Optimized bundle size

### Migration Steps

1. **Update dependency**:
   ```bash
   bun install lucide-react@^0.562.0
   ```

2. **Check for icon design changes**:
   - Review `paint-bucket` icon usage
   - Visual changes may require design review

3. **Test React Native Web** (if applicable):
   - Verify `className` prop works correctly

4. **Verify tree-shaking**:
   - Bundle size should be optimized
   - Only imported icons should be included

### Code Examples

**Using new toolbox icon**:
```tsx
import { Toolbox } from 'lucide-react';

<Toolbox size={24} />
```

**Tree-shaking example**:
```tsx
// Only imports the specific icons needed
import { Home, Settings, User } from 'lucide-react';

// Bundle will only include these three icons
```

**References**:
- [Lucide Icons Documentation](https://lucide.dev/)
- [GitHub Releases](https://github.com/lucide-icons/lucide/releases)

---

## Migration Priority and Order

### Recommended Migration Order:

1. **Low Risk (Do First)**:
   - Lucide-react (0.541.0 → 0.562.0)
   - @vitejs/plugin-react (4.7.0 → 5.1.2)
   - @types/node (24.1.0 → 25.0.3)
   - Date-fns (3.6.0 → 4.1.0)

2. **Medium Risk (Do Second)**:
   - Husky (8.0.0 → 9.1.7)
   - jsdom (26.1.0 → 27.4.0)
   - Sonner (1.5.0 → 2.0.7)
   - @hookform/resolvers (3.3.4 → 5.2.2)

3. **High Risk (Do Last, Test Thoroughly)**:
   - Recharts (2.12.7 → 3.6.0)

### Testing Checklist

After each migration:

- [ ] TypeScript compilation succeeds
- [ ] Development server starts without errors
- [ ] Production build completes successfully
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Visual regression testing for UI changes
- [ ] Manual testing of affected features

### Rollback Plan

If any migration causes issues:

1. **Immediate rollback**:
   ```bash
   git checkout -- package.json bun.lock
   bun install
   ```

2. **Investigate and fix**:
   - Review error messages
   - Check migration guide steps
   - Search GitHub issues

3. **Incremental approach**:
   - Migrate one package at a time
   - Commit after each successful migration
   - Makes rollback easier

---

## Additional Resources

- [Bun Package Manager Documentation](https://bun.sh/docs/cli/install)
- [TypeScript Breaking Changes](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Vite Migration Guides](https://vite.dev/guide/migration)

---

**Last Updated**: December 30, 2025
**Generated for**: GhostSpeak Package Upgrades
