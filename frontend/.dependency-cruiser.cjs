/** @type {import('dependency-cruiser').IConfiguration} */
const TEST = '(?:^|/)(?:__tests__|tests|test|mocks|__mocks__|__fixtures__|test-utils)(?:/|$)|[.](?:test|spec|stories)[.](?:[cm]?[jt]s|[jt]sx)$|(?:^|/)setupTests[.][jt]sx?$';
const SRC = '^src/';
const SHARED = '^src/(?:shared|components/ui|lib|utils)/';
const APP = '^src/(?:app|pages|routes)/';
const FEATURES = '^src/features/';

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-orphans', severity: 'warn', from: { orphan: true, path: SRC,
      pathNot: [TEST, '[.]d[.]ts$', '^src/(?:main|index)[.][jt]sx?$', '(?:^|/)[.][^/]+$'] }, to: {} },
    { name: 'not-to-deprecated', severity: 'warn', from: {}, to: { dependencyTypes: ['deprecated'] } },
    { name: 'no-non-package-json', severity: 'error', from: {}, to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] } },
    { name: 'not-to-unresolvable', severity: 'error', from: {}, to: { couldNotResolve: true } },
    { name: 'no-duplicate-dep-types', severity: 'warn', from: {}, to: { moreThanOneDependencyType: true, dependencyTypesNot: ['type-only'] } },
    { name: 'not-to-test', severity: 'error', from: { path: SRC, pathNot: TEST }, to: { path: TEST } },
    { name: 'not-to-dev-dep', severity: 'error', from: { path: SRC, pathNot: TEST },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'], pathNot: 'node_modules/@types/' } },
    { name: 'optional-deps-used', severity: 'info', from: {}, to: { dependencyTypes: ['npm-optional'] } },
    { name: 'peer-deps-used', severity: 'warn', from: {}, to: { dependencyTypes: ['npm-peer'] } },
    { name: 'no-node-in-browser', severity: 'error', from: { path: SRC, pathNot: TEST }, to: { dependencyTypes: ['core'], dependencyTypesNot: ['type-only'] } },
    { name: 'no-frontend-to-backend', severity: 'error', from: { path: SRC }, to: { path: '^(?:[.][.]/)+backend/' } },
    // Architectural conventions: adjust paths to the actual source tree.
    { name: 'no-shared-to-features-or-app', severity: 'error', from: { path: SHARED }, to: { path: [FEATURES, APP] } },
    { name: 'no-feature-to-app', severity: 'error', from: { path: FEATURES }, to: { path: APP } },
    { name: 'no-cross-feature-imports', severity: 'error',
      comment: 'Keep features independent; compose them at application level or extract shared contracts.',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: FEATURES, pathNot: '^src/features/$1/' } },
    { name: 'no-foundation-to-ui', severity: 'error', from: { path: '^src/(?:lib|utils)/' },
      to: { path: '^src/(?:components|hooks)/' } },
  ],
  options: {
    doNotFollow: { path: ['node_modules'] },
    tsConfig: { fileName: 'tsconfig.app.json' },
    tsPreCompilationDeps: 'specify',
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'browser', 'default', 'types'],
      mainFields: ['browser', 'module', 'main', 'types', 'typings'],
    },
    skipAnalysisNotInRules: true,
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
      archi: { collapsePattern: '^src/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
      text: { highlightFocused: true },
    },
  },
};