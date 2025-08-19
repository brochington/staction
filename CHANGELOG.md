# Changelog

### 6.1.0
- an update function similar to React's state setter functions can now be returned in actions instead of just the raw next state. This helps solve issues with two async actions firing off at the same time, where internal calls to `state()` wouldn't return updated state from other actions in time. 

### 6.0.0 - May 8, 2025
- **New Passed Map** Add "passed" functionality, which is a Map that is set to in an action, and accessed on the output of the action. This enables passing things like created ids through the action, where normally only the entirely updated state object is available.
- `staction.init()` and the `initFunc` passed into it are now async, so you'll probably want to await it. 

- **Major Documentation Overhaul**:
    - Added a comprehensive `USAGE_GUIDE.md` with in-depth explanations, examples, and best practices for all features.
    - Introduced a detailed `API_REFERENCE.md` for quick lookups of all classes, methods, properties, and types.
    - Significantly revamped `README.md` to be a more informative entry point, linking to the new detailed documentation and updating examples to reflect current best practices.
- Enhanced documentation clarity for core concepts including:
    - Asynchronous `init()` process and `initFunc`.
    - The "passed" map functionality for returning auxiliary data from actions.
    - Detailed usage of various action types: plain functions, Promises (async/await), Generators, and Async Generators.
    - In-depth explanation of middleware usage and capabilities.
    - Advanced TypeScript patterns and type safety with Staction.
    - State initialization lifecycle and error handling.
    - React integration examples and patterns.
- Ensured all code examples in documentation are up-to-date with the latest Staction features and TypeScript best practices.

### 5.2.0 - May 14, 2024
- Update all deps
- use native `reduce` and `groupby` instead of lodash versions.
- 

### 5.0.0 - May 26, 2021
- Add ESM bundle.
- Update dependencies (Webpack, Karma, etc)
- Remove Babel regenerator runtime and preset-env.

### 4.2.5 - Feb 27, 2021

- Add better internal initialization state structure.
- Expose `stactionInstance.initialized` and `stactionInstance.initState` getter to tell if the store is ready.

### 4.2.4 - Feb 25, 2021

- Update Typescript types, to be ~a little~ better.


### 4.2.2 - Jan 10, 2021

- Update packages, except webpack 5 related packages, as they are breaking tests.