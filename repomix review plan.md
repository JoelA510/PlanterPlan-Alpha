# Infrastructure Migration (CRA ➔ Vite)

Begin by uninstalling CRA-specific tools (e.g. react-scripts) and installing Vite with the React plugin. Update package.json scripts: replace "start", "build" with Vite equivalents (e.g. "dev": "vite" and "build": "vite build"). Move public/index.html to project root and update its <script> tag to point to the new entry (e.g. <script type="module" src="/src/main.jsx"></script>). Create a vite.config.js exporting a basic config:

// vite.config.js

import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

export default defineConfig({

plugins: [react()],

build: {

outDir: 'build' // match CRA’s output if needed

},

// Example: Vitest config for testing

test: {

globals: true,

environment: 'jsdom',

setupFiles: './src/setupTests.js',

},

});

Update environment variables: rename any REACT_APP_*keys to VITE_*. In code use import.meta.env.VITE_FOO instead of process.env.REACT_APP_FOO[1]. Similarly, static assets no longer use process.env.PUBLIC_URL; simply reference files from /public directly (e.g. <img src="/logo.png" />[2]). A summary of differences:

<table>
<tr>
<th>Feature</th>
<th>CRA Usage</th>
<th>Vite Usage</th>
</tr>
<tr>
<td>Env var prefix</td>
<td>REACT_APP_</td>
<td>VITE_[1]</td>
</tr>
<tr>
<td>Access in code</td>
<td>process.env.REACT_APP_FOO</td>
<td>import.meta.env.VITE_FOO[1]</td>
</tr>
<tr>
<td>Static assets</td>
<td>public/logo.png via PUBLIC_URL</td>
<td>/logo.png from public/[2]</td>
</tr>
</table>

Service workers and PWA support must be handled manually. CRA’s default serviceWorker.ts is dropped; if you need an offline/PWA setup, use vite-plugin-pwa or another SW solution. Code-splitting is automatic: Vite (using Rollup) splits dynamic imports into chunks[3]. Ensure any large routes or components use React.lazy/import() for lazy loading.

Key steps: uninstall CRA, install Vite with npm i vite @vitejs/plugin-react, move/adjust files (index.html, CSS imports), rename env vars, update scripts, configure assets and code splitting. The result is a faster dev server and optimized builds [Vite pre-bundles deps with esbuild, giving instant HMR](4)[5].

# Tailwind CSS v4 Installation & Migration

The project currently uses **manual CSS utility classes** (e.g., in `globals.css`) that mimic Tailwind but does not actually depend on `tailwindcss`. The goal is to **Install** Tailwind v4 and replace these manual definitions with the actual framework.

Upgrade to Tailwind v4 using the official Vite plugin. Install it with:

```bash
npm install tailwindcss @tailwindcss/vite -D
```

Then in `vite.config.js` add: `import tailwindcss from '@tailwindcss/vite'` and include it in plugins.

**Migration Strategy**:

1. Install Tailwind v4.
2. Direct `globals.css` to use `@import "tailwindcss";`.
3. **Delete** the manual utility classes in `globals.css` (e.g., `.w-64`, `.flex`, `.bg-blue-600`) as they will now be provided by Tailwind.
4. Map existing custom variables (e.g., `--brand-primary`) to the Tailwind theme using `@theme`.

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-primary: #f1592a;
  /* ... map other variables ... */
}
```

This ensures we remove thousands of lines of manual CSS maintenance.

<table>
<tr>
<th>Method</th>
<th>Activation</th>
</tr>
<tr>
<td>Media (default)</td>
<td>prefers-color-scheme: dark (system-driven)</td>
</tr>
<tr>
<td>Class</td>
<td>@custom-variant dark (&amp;:where(.dark, .dark *)) – toggled via a .dark class[9]</td>
</tr>
<tr>
<td>Data attr</td>
<td>e.g. @custom-variant dark (&amp;:where([data-theme=dark], [data-theme=dark] *))</td>
</tr>
</table>

Dark mode design should ensure good contrast (light text on dark bg). Tailwind’s dark: variants and CSS variables make it easy to define both light and dark token values.

# UI Design System and Accessibility

Semantic Tokens: Define design tokens (colors, spacing, typography) as semantic variables rather than raw values. For example, use --color-bg instead of a hex, then reference it in Tailwind config or @theme. This creates intuitive utility names (e.g. bg-bg or text-primary). Store all tokens centrally (e.g. in tailwind.css or theme files) for consistency.

Responsive Utilities: Leverage Tailwind’s mobile-first breakpoints. Prefix classes with sm:, md:, etc. to adjust at different screen widths (e.g. <div class="p-4 md:p-8 lg:p-12">). Tailwind makes it easy:

“Every utility class in Tailwind can be applied conditionally at different breakpoints... prefix the utility with the breakpoint name”[10].

For example:

<div class="text-base sm:text-lg md:text-xl lg:text-2xl">

Adaptive heading

</div>

Tailwind’s default breakpoints (sm:640px, md:768px, etc.) cover most needs[11].

Accessibility: Build with a11y in mind from the start:

Use semantic HTML (<header>, <button>, etc.) and ARIA roles where needed.

Focus states: Tailwind’s ring utilities (e.g. focus:outline-none focus:ring-2 focus:ring-primary) provide visible outlines. Ensure every interactive element is keyboard-focusable.

Contrast: Choose token colors with sufficient contrast. Tools like WebAIM contrast checker help. Consider automated tests (e.g. jest-axe or Axe CI) to validate contrast.

Aria-labelledby: For complex components, ensure proper labels for screen readers.

Semantic wrappers: Use screen-reader-only utilities (sr-only) for visually hidden labels when needed.

Add eslint-plugin-jsx-a11y (already installed in [28†L61-L69]) to catch common issues in JSX (e.g. missing alt, unlabelled interactive elements). Enable rules that enforce alt text, label associations, etc.

Design tokens and styles should be documented. Consider a style guide or Storybook (see next) to preview components. Prioritize accessibility (WCAG 2.1 AA) in the theme and utilities.

# Testing, Linting, and Tooling

Testing: Switch from Jest to Vitest for faster ESM-compatible tests. Vitest is a drop-in Jest replacement for Vite apps[12][13]. Install and configure:

npm install -D vitest @testing-library/react

Update package.json:

"scripts": {

"test": "vitest"

}

Add test configuration to vite.config.js (see snippet above). Ensure globals: true (so you can use describe/it/expect without imports) and environment: 'jsdom' for React DOM. For example[14]:

// vite.config.js

export default defineConfig({

// ...

test: {

globals: true,

environment: 'jsdom',

setupFiles: './src/setupTests.js'

}

});

Move or adapt existing tests. Vitest supports Jest-like APIs and works with React Testing Library. Update any snapshot tests if needed.

TypeScript (optional): If the project isn’t already TS, consider adding TypeScript for type safety. It catches many bugs early and improves refactoring confidence. Set up tsconfig.json, rename files to .tsx, and configure Vite for TS (it works out of the box). If opting for JS only, at least enable ESLint with modern ECMAScript settings.

Linting and Formatting: Install ESLint, Prettier and plugins. For example:

npm install -D eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y eslint-plugin-import

(as in [28†L61-L69]). Create an .eslintrc extending recommended configs (e.g. eslint:recommended, plugin:react/recommended). Integrate Prettier to auto-format code, disabling conflicting ESLint rules. Add scripts:

"scripts": {

"lint": "eslint 'src/**/*.{js,jsx,ts,tsx}' --quiet",

"lint:fix": "eslint --fix 'src/**/*.{js,jsx,ts,tsx}'",

"format": "prettier --write 'src/**/*.{js,jsx,ts,tsx,css,md}'"

}

Run linting on every commit or push to catch issues early.

# CI/CD and GitHub Actions

Implement GitHub Actions workflows to automate build, test, lint, and deploy. For example, create .github/workflows/ci.yml with jobs on push and pull_request for the main branch. A sample workflow outline:

name: CI

on: [push, pull_request]

jobs:

build-and-test:

runs-on: ubuntu-latest

steps:

\- uses: actions/checkout@v3

\- uses: actions/setup-node@v3

with: node-version: 18

\- run: npm ci

\- run: npm run lint # ESLint checks

\- run: npm run test # Vitest runs

\- run: npm run build # Vite production build

On merge to main, add a deploy job. Depending on your hosting (e.g. Vercel, Netlify, GitHub Pages), the deployment step differs. For static builds, you could upload the dist folder via an action or use the platform’s integration. The pipeline should fail on lint or test errors. This aligns with CI best practices: “testing, linting, and automatic deployment when code is pushed to the main branch”[15].

Use action caching (actions/cache) for ~/.npm or node_modules to speed up runs. Store secrets (API keys, FTP creds) in GitHub Secrets. Example: if deploying via FTP or SSH, store credentials and run a deploy script.

CD Strategy: For rapid iteration, consider preview deployments for PRs (e.g. Vercel Preview URLs). On main, push a stable build to production.

# Storybook and Component Development

Set up Storybook (v7+) with Vite for isolated component development. Run npx storybook@latest init – it will detect React and configure .storybook/. Install any necessary Storybook add-ons (Docs, Controls, etc.).

Integrate Tailwind into Storybook by importing your global styles. Create src/tailwind.css (with your @import "tailwindcss"; @theme {...}) and ensure Storybook loads it. In .storybook/preview.js (or .ts):

// .storybook/preview.js

import '../src/tailwind.css';

This makes Tailwind utilities available in all stories[16]. Use Storybook’s theming (add-ons) if you want to toggle light/dark mode within the UI.

Use Storybook for visual testing and documentation: write stories for UI components (buttons, forms, cards) and configure knobs for props (e.g. color, size). This aids the “Warm Productivity” design goal by letting designers/developers preview components in isolation. Also enable @storybook/addon-a11y to check accessibility of each component in Storybook.

# Internationalization (i18n) Setup

Include react-i18next for localization. Install i18next, react-i18next, and a backend (e.g. i18next-http-backend) for loading JSON files. Initialize in a file (e.g. src/i18n.js):

import i18n from 'i18next';

import { initReactI18next } from 'react-i18next';

import Backend from 'i18next-http-backend';

i18n

.use(Backend)

.use(initReactI18next)

.init({

fallbackLng: 'en',

debug: false,

ns: ['common'], // default namespace(s)

defaultNS: 'common',

backend: {

loadPath: '/locales/{{lng}}/{{ns}}.json'

}

});

Place locale files under public/locales/en/\*.json, public/locales/es/\*.json, etc. For lazy-loaded namespaces, use i18next.loadNamespaces('featureX') or React’s Suspense. For example, you might have separate JSON per feature or route. i18next supports dynamic loading to split large translation bundles[17]:

i18next.loadNamespaces('home', () => {

// home.json loaded for 'home' namespace

});

Wrap the app in <I18nextProvider> and use useTranslation(). Default the language to English. Ensure text is not hardcoded; use translation keys in code.

Organize locales/ with a folder per language and JSON per namespace, e.g.:

public/locales/

├─ en/

│ ├─ common.json

│ ├─ home.json

│ └─ features.json

└─ es/

├─ common.json

├─ home.json

└─ features.json

# Project Structure

Adopt a clear folder layout for scalability. A suggested structure:

src/

app/ // Main app (e.g. App.jsx, global providers, routes)

components/ // Reusable UI components (atoms/molecules)

features/ // Feature-specific modules (with subfolders: UI + logic)

hooks/ // Custom React hooks

lib/ // Shared utilities/functions (e.g. API clients, helpers)

styles/ // Global styles (Tailwind imports, CSS variables)

locales/ // i18n JSON files or related helpers

tests/ // Additional test utilities or fixtures

app/: entry points and route definitions.

components/: stateless UI elements (buttons, inputs, layout grids).

features/: each domain/feature (e.g. tasks, projects) with its components, slices (if using Redux), and hooks.

hooks/: generic custom hooks (e.g. useAuth, useFetch).

lib/: low-level modules (e.g. API client, date utils).

styles/: Tailwind imports or global CSS. With Tailwind v4’s JIT, most styles come via classes, so this might only contain the base @import "tailwindcss" file.

locales/: default language JSON (if not in public), or i18n initialization.

tests/ (optional): global test setup or e2e tests.

Use clear naming (PascalCase.jsx for components). Keep index files to export modules. This structure promotes feature encapsulation and reusable utilities.

# Governance and Documentation (.agent/)

In .agent/, include guiding documentation for the team/automation agent:

Architecture.md: Describe overall architecture (React SPA with Vite, data flow, services like Supabase if used). Outline folder conventions.

Design.md: Document design principles (“Warm Productivity” theme: palette of warm neutrals and active colors, rounded corners, generous whitespace, etc.), component library standards (buttons, cards), and Tailwind theming strategy (semantic tokens).

Accessibility.md: List a11y rules (WCAG targets, keyboard navigation, color contrast thresholds). Remind to use eslint-plugin-jsx-a11y and to test with tools like Axe or Lighthouse.

Testing.md: Explain test coverage goals, where unit vs integration tests go, how to run Vitest, and how to mock APIs (e.g. using MSW or jest mocks).

Deployment.md: Outline the CI/CD process, environment variables management (.env, secrets), and deployment targets (e.g. Vercel instructions or FTP).

CodingStandards.md: Summarize lint/prettier rules, commit message style, branching strategy.

Each governance file should reference this plan and provide clear guidelines. For example, Accessibility.md might excerpt accessibility testing (linting, contrast). Design.md could include example CSS variables or component markup. These docs help onboard new contributors and enforce consistency.

By following this plan—migrating the build system, adopting Tailwind v4 theming, refactoring the design system, ensuring rigorous testing and CI/CD, and scaffolding i18n and a11y—you will modernize the application for performance, maintainability, and “Warm Productivity” UX.

Sources: Best practices and migration strategies from the React/Vite and Tailwind communities[18][2][7][9][16][17][10][19][15].

[1] [2] [4] [5] [12] [14] [18] Migrating from Create React App to Vite: A Modern Approach | by Adhithi Ravichandran | Medium

<https://adhithiravi.medium.com/migrating-from-create-react-app-to-vite-a-modern-approach-76148adb8983>

[3] Features | Vite

<https://vite.dev/guide/features>

[6] [7] Theme variables - Core concepts - Tailwind CSS

<https://tailwindcss.com/docs/theme>

[8] Theming best practices in v4 · tailwindlabs tailwindcss · Discussion #18471 · GitHub

<https://github.com/tailwindlabs/tailwindcss/discussions/18471>

[9] Dark mode - Core concepts - Tailwind CSS

<https://tailwindcss.com/docs/dark-mode>

[10] [11] Responsive design - Core concepts - Tailwind CSS

<https://tailwindcss.com/docs/responsive-design>

[13] Migrating from Jest to Vitest for your React Application - DEV Community

<https://dev.to/opensauced/migrating-from-jest-to-vitest-for-your-react-application-1b75>

[15] Setting up Continuous Deployment (CD) Pipeline for React Vite using GitHub Actions | by Rajan Verma | Medium

<https://medium.com/@rajan-verma03/setting-up-continuous-deployment-cd-pipeline-for-react-vite-using-github-actions-222398334475>

[16] Integrating Storybook with Tailwind CSS v4.1 in a React + Vite Project (TypeScript or JavaScript) | by Ayomitunde I. | Medium

<https://medium.com/@ayomitunde.isijola/integrating-storybook-with-tailwind-css-v4-1-f520ae018c10>

[17] Namespaces | i18next documentation

<https://www.i18next.com/principles/namespaces>

[19] Setting Up ESLint and Prettier in a React Project with Vite | by Leandro A. Siqueira | Medium

<https://leandroaps.medium.com/setting-up-eslint-and-prettier-in-a-react-project-with-vite-c2ab658dc0e7>
