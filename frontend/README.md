# Blueprint frontend

React and TypeScript frontend using Vite and Material UI. See the [repository README](../README.md) for setup and development commands.

```sh
npm ci
npm run lint
npm test
npm run build
```

Use a disposable backend for Playwright. The authenticated shell and shared UI live in `src/app` and `src/components`. Features and corresponding API clients live in `src/features` and `src/api`.
