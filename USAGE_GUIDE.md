# Staction Usage Guide

Welcome to the Staction Usage Guide! This document will walk you through the core concepts, features, and best practices for using Staction to manage your application's state.

## Table of Contents

1.  [Introduction](#introduction)
2.  [Core Concepts](#core-concepts)
    *   [State](#state)
    *   [Actions](#actions)
    *   [Staction Instance](#staction-instance)
    *   [Initialization (`init`)](#initialization-init)
    *   [State Set Callback](#state-set-callback)
3.  [Getting Started](#getting-started)
    *   [Installation](#installation)
    *   [Basic Setup (JavaScript)](#basic-setup-javascript)
    *   [Basic Setup (TypeScript)](#basic-setup-typescript)
4.  [Actions In-Depth](#actions-in-depth)
    *   [Action Signature](#action-signature)
    *   [Return Values](#return-values)
        *   [Plain Objects](#plain-objects)
        *   [Promises (Async Actions)](#promises-async-actions)
        *   [Generators](#generators)
        *   [Async Generators](#async-generators)
        *   [Returning `undefined`](#returning-undefined)
    *   [Accessing Current State (`params.state()`)](#accessing-current-state-paramsstate)
    *   [Calling Other Actions (`params.actions`)](#calling-other-actions-paramsactions)
    *   [The "Passed" Map (`params.passed`)](#the-passed-map-paramspassed)
5.  [TypeScript Usage](#typescript-usage)
    *   [Defining State and Action Types](#defining-state-and-action-types)
    *   [Typing `ActionParams`](#typing-actionparams)
    *   [Typing the Staction Instance](#typing-the-staction-instance)
    *   [Typing `PassedMapType`](#typing-passedmaptype)
6.  [Middleware](#middleware)
    *   [Defining Middleware](#defining-middleware)
    *   [Pre and Post Middleware](#pre-and-post-middleware)
    *   [Modifying State in Middleware](#modifying-state-in-middleware)
    *   [Asynchronous Middleware](#asynchronous-middleware)
    *   [Middleware Error Handling](#middleware-error-handling)
7.  [Initialization Lifecycle](#initialization-lifecycle)
    *   [`initFunc` and Initial State](#initfunc-and-initial-state)
    *   [Dispatching Actions During Initialization](#dispatching-actions-during-initialization)
    *   [Initialization Status (`initState`, `initialized`)](#initialization-status-initstate-initialized)
    *   [Handling Initialization Errors](#handling-initialization-errors)
8.  [Logging and Debugging](#logging-and-debugging)
9.  [React Integration Example (TypeScript)](#react-integration-example-typescript)
10. [Best Practices](#best-practices)

## 1. Introduction

Staction offers a minimal yet powerful approach to state management. It's designed to be straightforward for simple use cases while providing robust support for complex asynchronous workflows. Its core philosophy revolves around a central state object updated by well-defined actions.

**Key Features:**

*   Simple and predictable state updates.
*   First-class support for Promises, Generators, and Async Generators in actions.
*   Strong TypeScript integration for type safety.
*   Middleware support for cross-cutting concerns (e.g., logging, API calls).
*   "Passed" map feature to return auxiliary data from actions.
*   Lightweight and focused.

## 2. Core Concepts

### State

The **state** is a single JavaScript object that represents the entire data model of your application or a relevant part of it. It's immutable in the sense that actions don't modify the state directly; they return a *new* state object.

### Actions

**Actions** are functions that orchestrate state changes. They are the only way to update the state. An action receives the current state (via a getter function) and any necessary parameters, then returns data that Staction uses to determine the new state.

### Staction Instance

You interact with Staction by creating an instance of the `Staction` class:
`const staction = new Staction();`
This instance will hold your state, your actions, and methods to manage them.

### Initialization (`init`)

Before you can use a Staction instance, it must be initialized using the `staction.init()` method. This asynchronous method takes:
1.  An object containing your action definitions.
2.  An `initFunc` that sets the initial state (and can optionally dispatch actions).
3.  A `stateSetCallback` function that gets called every time the state updates.

```javascript
await staction.init(myActions, () => ({ count: 0 }), (newState) => {
  console.log('State updated:', newState);
});
```

### State Set Callback

The `stateSetCallback` function, provided during `init`, is crucial for connecting Staction to your UI or other parts of your application. It's invoked after every successful state update resulting from an action (including those from middleware or within generators).

## 3. Getting Started

### Installation

```bash
npm install staction
# or
yarn add staction
```

### Basic Setup (JavaScript)

```javascript
import Staction from 'staction';

// 1. Create a Staction instance
const staction = new Staction();

// 2. Define actions
const actions = {
  increment: ({ state }) => ({ count: state().count + 1 }),
  decrement: ({ state }) => ({ count: state().count - 1 }),
  setValue: ({ state }, newValue) => ({ count: newValue }),
};

// 3. Define the initial state function
const getInitialState = () => ({ count: 0 });

// 4. Define the state set callback
const onStateUpdate = (newState, wrappedActions) => {
  console.log('Current count:', newState.count);
  // You might update your UI here
  // wrappedActions are available if you need to trigger further actions from the callback
};

// 5. Initialize Staction (async operation)
async function startApp() {
  try {
    await staction.init(actions, getInitialState, onStateUpdate);
    console.log('Staction initialized. Initial state:', staction.state);

    // 6. Dispatch actions
    const result1 = await staction.actions.increment();
    console.log('After increment:', result1.state); // { count: 1 }

    const { state: stateAfterSet, passed } = await staction.actions.setValue(10);
    console.log('After setValue:', stateAfterSet); // { count: 10 }
    console.log('Passed data from setValue:', passed); // Map {}

  } catch (error) {
    console.error('Initialization or action error:', error);
  }
}

startApp();
```

### Basic Setup (TypeScript)

```typescript
import Staction, { ActionParams } from 'staction';

// 1. Define State and Action types
type CounterState = {
  count: number;
  lastAction?: string;
};

// Define the structure of your actions object
type CounterActions = {
  increment: (params: ActionParams<CounterState, CounterActions>) => CounterState;
  decrement: (params: ActionParams<CounterState, CounterActions>) => CounterState;
  setValue: (params: ActionParams<CounterState, CounterActions>, newValue: number) => CounterState;
};

// 2. Create a Staction instance with types
const staction = new Staction<CounterState, CounterActions>();

// 3. Implement actions
const counterActionsImpl: CounterActions = {
  increment: ({ state }) => ({ ...state(), count: state().count + 1, lastAction: 'increment' }),
  decrement: ({ state }) => ({ ...state(), count: state().count - 1, lastAction: 'decrement' }),
  setValue: ({ state }, newValue) => ({ ...state(), count: newValue, lastAction: 'setValue' }),
};

// 4. Define the initial state function
const getInitialState = (): CounterState => ({ count: 0 });

// 5. Define the state set callback
const onStateUpdate = (newState: CounterState /* wrappedActions: WrappedActions<CounterState, CounterActions> */) => {
  console.log('Current count (TS):', newState.count, 'Last action:', newState.lastAction);
  // Update React state, Svelte store, etc.
};

// 6. Initialize Staction
async function startTypedApp() {
  try {
    await staction.init(counterActionsImpl, getInitialState, onStateUpdate);
    console.log('Staction (TS) initialized. Initial state:', staction.state);

    // 7. Dispatch actions (typed)
    const { state: incrementedState } = await staction.actions.increment();
    // incrementedState is typed as CounterState

    const { state: finalState } = await staction.actions.setValue(100);
    // finalState is typed as CounterState

  } catch (error) {
    console.error('Initialization or action error (TS):', error);
  }
}

startTypedApp();
```

## 4. Actions In-Depth

### Action Signature

Every action function you define receives a single object as its first parameter, conventionally named `params`. This object has the following properties:

*   `state: () => State`: A function. Call `params.state()` to get the current, up-to-date state.
*   `actions: WrappedActions<State, Actions, PassedMapType>`: An object containing all other actions, allowing you to call actions from within another action.
*   `passed: (updater) => void`: A function to set auxiliary data that will be returned alongside the state when the action resolves.
*   `name: string`: The name of the action currently being executed.

Any additional arguments passed when dispatching an action will follow the `params` object.

```typescript
// Example action definition
const actions = {
  updateUser: (
    params: ActionParams<MyState, MyActions>, // First argument is always params
    userId: string,                           // Subsequent arguments
    newDetails: Partial<User>
  ): MyState => {
    const currentUser = params.state().users[userId];
    // ... logic to update user
    return {
      ...params.state(),
      users: { ...params.state().users, [userId]: { ...currentUser, ...newDetails } },
    };
  }
};

// Dispatching the action
// await staction.actions.updateUser('user-123', { name: 'New Name' });
```

### Return Values

Staction is flexible in what your actions can return.

#### Plain Objects

The simplest form: return the new state object directly.

```javascript
const actions = {
  setName: ({ state }, newName) => ({ ...state(), name: newName }),
};
```

#### Promises (Async Actions)

For asynchronous operations, return a Promise that resolves with the new state.

```javascript
const actions = {
  fetchUserData: async ({ state }, userId) => {
    const response = await fetch(`/api/users/${userId}`);
    const userData = await response.json();
    return { ...state(), user: userData, loading: false };
  },
};
```

#### Generators

Generator functions (`function*`) allow you to yield multiple state updates sequentially. Each `yield` should produce a value that Staction can use to form a new state (e.g., a new state object, or a Promise resolving to one). The `stateSetCallback` is called after each yield that results in a state change.

```javascript
const actions = {
  complexFlow: function* ({ state }) {
    yield { ...state(), status: 'Step 1: Starting' };
    // params.state().status is now 'Step 1: Starting'

    const data = yield fetch('/api/data').then(res => res.json());
    // Here, we yield a Promise. Staction waits for it to resolve.
    // The resolved value of the promise (`data`) is NOT directly set as state.
    // Instead, the generator resumes, and the *next* yield will set the state.
    // To set state based on `data`, you need another yield:

    yield { ...state(), data, status: 'Step 2: Data fetched' };
    // params.state().status is now 'Step 2: Data fetched'

    // The final return value of a generator is also processed as a state update.
    return { ...state(), status: 'Completed' };
  },
};
```
When a generator yields a Promise, Staction awaits that Promise. The generator execution pauses until the Promise resolves, and the resolved value is then passed back into the generator at the `yield` point. The state is updated based on what is *yielded*. If a yielded Promise resolves to a new state object, that becomes the new state.

#### Async Generators

Async generators (`async function*`) combine the power of async/await with generators. This is excellent for sequences of async operations where each step might update the state.

```javascript
const actions = {
  loadAndProcess: async function* ({ state }) {
    yield { ...state(), loadingMessage: 'Fetching initial data...' };

    const initialData = await fetch('/api/initial').then(res => res.json());
    yield { ...state(), data: initialData, loadingMessage: 'Processing...' };

    const processedData = await someAsyncProcessing(initialData);
    yield { ...state(), data: processedData, loadingMessage: 'Almost done...' };

    // Final return value is also processed
    return { ...state(), data: processedData, loadingMessage: 'Done!' };
  },
};
```

#### Returning `undefined`

If an action (or a middleware, or a yield from a generator) returns `undefined` (and it's not a Promise or Generator that might *resolve* to `undefined`), Staction interprets this as "no state change from this specific step." The current state remains as is. However, the `stateSetCallback` will still be called with the current (unchanged) state, unless the action itself threw an error before any state update could occur.

### Accessing Current State (`params.state()`)

Inside an action, `params.state` is a *function*. You **must call it** (`params.state()`) to get the current state object. This ensures you always have the most up-to-date state, especially crucial in asynchronous actions or generators where other actions might have modified the state in the meantime.

```javascript
const actions = {
  incrementIfEven: ({ state }) => {
    const currentCount = state().count; // Correct: call state()
    if (currentCount % 2 === 0) {
      return { count: currentCount + 1 };
    }
    return state(); // No change, return current state
  },
};
```

### Calling Other Actions (`params.actions`)

The `params.actions` object gives you access to all *wrapped* actions, just like `staction.actions`. This allows for composition and reuse of action logic. Remember that calling an action this way also returns `Promise<{ state: State, passed: PassedMapType }>`.

```javascript
const actions = {
  increment: ({ state }) => ({ count: state().count + 1 }),
  incrementTwice: async ({ actions }) => {
    await actions.increment(); // First increment
    // The state is updated after the first call.
    // The second call will operate on the updated state.
    const { state: finalState } = await actions.increment(); // Second increment
    return finalState; // Or simply rely on the last action's state propagation
  },
};
```

### The "Passed" Map (`params.passed`)

Sometimes, an action needs to communicate auxiliary data back to its caller, data that isn't necessarily part of the global state. The `passed` map is for this.

`params.passed` is a function that takes an `updater`.
*   If `updater` is a `Map` instance, its entries are merged into the action's dedicated `passed` map.
*   If `updater` is a function, it receives the current `passed` map for that action and should return the modified map.

The accumulated `passed` map is returned alongside the `state` when the wrapped action promise resolves: `{ state: State, passed: PassedMapType }`.

```typescript
type MyState = { lastId: number | null };
type MyPassedMap = Map<string, number | string>; // Customize your passed map type

const actions = {
  createItem: (
    { state, passed }: ActionParams<MyState, typeof actions, MyPassedMap>,
    itemName: string
  ) => {
    const newId = Date.now();
    passed((currentMap) => { // Function updater
      currentMap.set('createdItemId', newId);
      currentMap.set('statusMessage', `Item '${itemName}' created.`);
      return currentMap;
    });
    // Or: passed(new Map([['createdItemId', newId]])); // Map instance updater

    return { ...state(), lastId: newId };
  },
};

// Usage:
// const staction = new Staction<MyState, typeof actions, MyPassedMap>();
// ... init staction ...
// const { state, passed } = await staction.actions.createItem('My New Gadget');
// console.log('New item ID from passed map:', passed.get('createdItemId'));
// console.log('Status from passed map:', passed.get('statusMessage'));
```
Each action call gets its own isolated `passed` map. If an action calls another action, the `passed` map of the inner action is *not* automatically merged into the outer action's `passed` map. The outer action would receive the inner action's `passed` map as part of the `Promise` resolution and can then choose to incorporate parts of it if needed.

## 5. TypeScript Usage

Staction is built with TypeScript and provides strong typing support.

### Defining State and Action Types

Always start by defining types for your `State` and your `Actions` object.

```typescript
// src/types.ts
export type AppState = {
  user: { id: string; name: string; email: string } | null;
  isLoading: boolean;
  theme: 'light' | 'dark';
};

// Forward declare ActionParams and WrappedActions if needed for complex setups,
// or import them directly in your actions file.
import { ActionParams, WrappedActions } from 'staction';

// Define the Actions object type. Keys are action names, values are action function signatures.
export type AppActions = {
  setUser: (params: ActionParams<AppState, AppActions>, user: AppState['user']) => AppState;
  setTheme: (params: ActionParams<AppState, AppActions>, theme: AppState['theme']) => AppState;
  fetchUser: (params: ActionParams<AppState, AppActions>, userId: string) => Promise<AppState>;
  complexFlow: (params: ActionParams<AppState, AppActions>) => Generator<AppState | Promise<AppState>, AppState, any>;
};
```

### Typing `ActionParams`

Use the `ActionParams<State, Actions, PassedMapType?>` type for the first parameter of your action functions.

```typescript
// src/actions.ts
import { ActionParams } from 'staction';
import { AppState, AppActions } from './types'; // Your defined types

export const appActionsImpl: AppActions = {
  setUser: (params: ActionParams<AppState, AppActions>, user) => {
    // params.state() is typed as () => AppState
    // params.actions is typed as WrappedActions<AppState, AppActions>
    return { ...params.state(), user, isLoading: false };
  },
  setTheme: ({ state }: ActionParams<AppState, AppActions>, theme) => {
    return { ...state(), theme };
  },
  // ... other actions
};
```

### Typing the Staction Instance

Provide your `State` and `Actions` types when creating the `Staction` instance:

```typescript
// src/store.ts
import Staction from 'staction';
import { AppState, AppActions } from './types';
import { appActionsImpl } from './actions';

const stactionInstance = new Staction<AppState, AppActions>();

// Initialize (example)
async function initializeStore() {
  await stactionInstance.init(
    appActionsImpl,
    () => ({ user: null, isLoading: false, theme: 'light' }), // Initial state
    (newState, wrappedActions) => { /* update UI */ }
  );
}

// stactionInstance.state is typed as AppState
// stactionInstance.actions.setUser will have its arguments and return type correctly inferred.
```

### Typing `PassedMapType`

If you use the `passed` functionality with a specific map structure, provide it as the third type argument to `Staction` and `ActionParams`.

```typescript
import Staction, { ActionParams } from 'staction';

type MyState = { value: number };
type MyPassedData = Map<'operationId' | 'timestamp', string | number>;

type MyActions = {
  performOperation: (
    params: ActionParams<MyState, MyActions, MyPassedData>,
    input: number
  ) => MyState;
};

const staction = new Staction<MyState, MyActions, MyPassedData>();

const actionsImpl: MyActions = {
  performOperation: ({ state, passed }, input) => {
    const opId = `op-${Date.now()}`;
    passed((map) => map.set('operationId', opId).set('timestamp', Date.now()));
    // passed map is now MyPassedData
    return { value: state().value + input };
  },
};
// ... init staction ...

// const { state, passed } = await staction.actions.performOperation(10);
// `passed` will be correctly typed as MyPassedData
```

## 6. Middleware

Middleware allows you to inject custom logic before (`pre`) or after (`post`) an action is executed. This is useful for logging, analytics, conditional execution, or transforming action results.

### Defining Middleware

A middleware is an object with `type` (`'pre'` or `'post'`), `method`, and `meta` properties.

```typescript
import { StactionMiddleware, StactionMiddlewareParams } from 'staction'; // Or your Staction.d.ts

type MyState = { count: number };
type MyMeta = { logPrefix: string };

const loggingMiddleware: StactionMiddleware = {
  type: 'pre', // Can be 'pre' or 'post'
  method: (params: StactionMiddlewareParams<MyState, MyMeta>) => {
    const { state, name, args, meta } = params;
    console.log(`${meta.logPrefix} Action '${name}' called with args:`, args);
    console.log(`${meta.logPrefix} State before action:`, state());
    // Pre-middleware can modify state before the action runs
    // return { ...state(), count: state().count + 1 }; // Example state modification
    // If it returns undefined, original state passes through
  },
  meta: { logPrefix: '[StactionLog]' }, // User-defined data
};

// staction.setMiddleware([loggingMiddleware]);
```

### Pre and Post Middleware

*   **`pre` middleware**: Runs *before* the main action function. It can modify the state that the action will receive.
*   **`post` middleware**: Runs *after* the main action function (and its potential Promises/Generators) has completed and produced a new state. It receives this new state and can further modify it.

Multiple middleware of the same type are executed in the order they are provided in the array to `setMiddleware`.

### Modifying State in Middleware

Middleware `method` functions can return a new state, a Promise resolving to a new state, or a Generator/AsyncGenerator yielding states, just like actions. If a `pre` middleware modifies the state, the subsequent action (and other `pre` middleware) will receive this modified state. If a `post` middleware modifies the state, that becomes the final state for that action cycle.

If a middleware returns `undefined` (and isn't a Promise/Generator that might resolve to `undefined`), it signals no state change from that middleware; the state from the previous step (or original state for the first `pre` middleware) is passed on.

### Asynchronous Middleware

Middleware methods can be `async` or return `Promise`s, or be `generator` / `async generator` functions. Staction will await/process them appropriately.

```typescript
const asyncPreMiddleware: StactionMiddleware = {
  type: 'pre',
  method: async ({ state, name }: StactionMiddlewareParams<any>) => {
    console.log(`Fetching some data before action ${name}...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    // Optionally return a modified state:
    // return { ...state(), preFetchedData: 'some data' };
  },
  meta: {},
};
```

### Middleware Error Handling

*   If a `pre` middleware throws an error, the main action and any subsequent `post` middleware for that action call **will not** run. The error will propagate to the caller of `staction.actions.actionName()`. The state will be whatever it was after the last successfully completed middleware (or the original state if the error occurred in the first `pre` middleware).
*   If the main action throws an error, `post` middleware **will not** run. The error propagates.
*   If a `post` middleware throws an error, the error propagates. The state will be whatever it was after the main action or the last successfully completed `post` middleware.

## 7. Initialization Lifecycle

### `initFunc` and Initial State

The `initFunc` provided to `staction.init()` is responsible for returning the very first state of your application. It can be a simple function returning an object, or an async function that fetches initial data.

```javascript
// Synchronous initFunc
const initSync = () => ({ user: null, settings: { theme: 'dark' } });

// Asynchronous initFunc
const initAsync = async () => {
  const settings = await fetch('/api/settings').then(res => res.json());
  return { user: null, settings };
};

// await staction.init(actions, initAsync, onStateUpdate);
```

### Dispatching Actions During Initialization

The `initFunc` receives the `wrappedActions` as its argument. This allows you to dispatch actions as part of your initialization sequence, which can be useful for complex setup logic.

```javascript
const actions = {
  loadUser: async ({ state }, userId) => { /* ... fetches user ... */ return { /* new state */ }; },
  applyTheme: ({ state }, theme) => ({ ...state(), theme }),
};

const advancedInitFunc = async (wrappedActions) => {
  let initialState = { user: null, theme: 'light', preferencesLoaded: false };

  // Call an action to load user (affects initialState if it returns state directly)
  const { state: stateAfterUserLoad } = await wrappedActions.loadUser('defaultUser');
  initialState = stateAfterUserLoad; // Capture state from action

  // Conditionally call another action
  if (initialState.user && initialState.user.preferredTheme) {
    const { state: stateAfterTheme } = await wrappedActions.applyTheme(initialState.user.preferredTheme);
    initialState = stateAfterTheme;
  }
  initialState.preferencesLoaded = true;
  return initialState; // This becomes the final initial state for Staction
};

// await staction.init(actions, advancedInitFunc, onStateUpdate);
// The `stateSetCallback` will be called for state changes from `loadUser` and `applyTheme`
// if they successfully update the state.
```
**Important**: The state returned by `initFunc` itself is what Staction primarily uses as its "initial state." While actions called within `initFunc` will run their course (including middleware and calling `stateSetCallback`), the *final return value* of `initFunc` sets the baseline state post-initialization if no actions directly preceded it.

### Initialization Status (`initState`, `initialized`)

You can check the initialization status:

*   `staction.initState`: A string: `'uninitialized'`, `'initializing'`, `'initialized'`, or `'initerror'`.
*   `staction.initialized`: A boolean: `true` if `initState` is `'initialized'`, `false` otherwise.

This is useful for conditionally rendering UI:

```javascript
// In a React component
// if (!staction.initialized) return <LoadingSpinner />;
```

### Handling Initialization Errors

If `initFunc` throws an error, or an error occurs during the internal setup of Staction (e.g., issues with action wrapping), `staction.init()` will reject, and `staction.initState` will be set to `'initerror'`. It's good practice to wrap `staction.init()` in a try/catch block.

```javascript
try {
  await staction.init(...);
} catch (error) {
  console.error("Staction initialization failed:", error);
  // Update UI to show an error state
  // staction.initState will be 'initerror'
}
```
If `init()` is called again while `initState` is `'initializing'`, `'initialized'`, or `'initerror'`, it will throw an error to prevent re-initialization issues.

## 8. Logging and Debugging

Staction provides simple logging utilities:

*   `staction.enableLogging()`: Turns on console logging for action calls.
*   `staction.disableLogging()`: Turns off logging.
*   `staction.enableStateWhenLogging()`: When logging is enabled, this also logs the *current state* before the action runs.
*   `staction.disableStateWhenLogging()`: Only logs action name and arguments.

```javascript
staction.enableLogging();
staction.enableStateWhenLogging(); // Now logs will include state

await staction.actions.someAction('payload');
// Console output: "action: someAction", { /* current state */ }, ["payload"] (if args logged)
// Or more simply: "action: ", "someAction", { /* current state */ }

staction.disableStateWhenLogging();
await staction.actions.someAction('payload2');
// Console output: "action: ", "someAction"
```

## 9. React Integration Example (TypeScript)

Here's a common pattern for using Staction with React and TypeScript, employing Context API.

```typescript
// src/state/appState.ts
export type AppState = {
  count: number;
  message: string;
};

export const initialAppState: AppState = {
  count: 0,
  message: 'Hello Staction!',
};

// src/state/appActions.ts
import { ActionParams } from 'staction';
import { AppState } from './appState';

export type AppActions = {
  increment: (params: ActionParams<AppState, AppActions>) => AppState;
  setMessage: (params: ActionParams<AppState, AppActions>, newMessage: string) => AppState;
};

export const appActionsImpl: AppActions = {
  increment: ({ state }) => ({ ...state(), count: state().count + 1 }),
  setMessage: ({ state }, newMessage) => ({ ...state(), message: newMessage }),
};

// src/state/StactionContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Staction from 'staction';
import { AppState, initialAppState } from './appState';
import { AppActions, appActionsImpl } !== './appActions';

// Create a Staction instance (singleton or per context)
const appStaction = new Staction<AppState, AppActions>();

export const StactionContext = createContext<Staction<AppState, AppActions>>(appStaction);

export const useStaction = () => useContext(StactionContext);

type StactionProviderProps = {
  children: ReactNode;
};

export const StactionProvider: React.FC<StactionProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  // This state is just to trigger re-renders when Staction's state changes.
  // The actual source of truth is appStaction.state.
  const [, setStactionStateSnapshot] = useState<AppState>(initialAppState);

  useEffect(() => {
    const initState = async () => {
      if (!appStaction.initialized && appStaction.initState === 'uninitialized') {
        try {
          await appStaction.init(
            appActionsImpl,
            () => initialAppState, // Or an async function for initial state
            (newStateFromStaction) => {
              // This callback from Staction updates our React state snapshot,
              // causing components consuming the context or state to re-render.
              setStactionStateSnapshot(newStateFromStaction);
            }
          );
          // Set initial snapshot after init completes
          setStactionStateSnapshot(appStaction.state);
          setIsInitialized(true);
        } catch (error) {
          console.error("Failed to initialize Staction for React:", error);
          // Handle init error, maybe set an error state
        }
      } else if (appStaction.initialized) {
         setIsInitialized(true);
         // if already initialized (e.g. HMR), ensure snapshot is current
         setStactionStateSnapshot(appStaction.state);
      }
    };
    initState();
  }, []); // Run only once on mount

  if (!isInitialized) {
    return <div>Loading store...</div>; // Or a proper loader
  }

  return (
    <StactionContext.Provider value={appStaction}>
      {children}
    </StactionContext.Provider>
  );
};

// src/components/Counter.tsx
import React from 'react';
import { useStaction } from '../state/StactionContext';

export const Counter: React.FC = () => {
  const staction = useStaction();
  // Access state directly from the staction instance for rendering
  const currentCount = staction.state.count;

  const handleIncrement = async () => {
    await staction.actions.increment();
    // No need to manually set React state here,
    // the stateSetCallback in StactionProvider handles it.
  };

  return (
    <div>
      <p>Count: {currentCount}</p>
      <button onClick={handleIncrement}>Increment</button>
    </div>
  );
};

// src/App.tsx
import React from 'react';
import { StactionProvider } from './state/StactionContext';
import { Counter } from './components/Counter';
// ... other components

const App: React.FC = () => {
  return (
    <StactionProvider>
      <h1>My Staction App</h1>
      <Counter />
      {/* Other components that can use useStaction() */}
    </StactionProvider>
  );
};

export default App;
```

In this React example:
1.  `StactionProvider` initializes Staction and makes the instance available via context.
2.  The `stateSetCallback` in `StactionProvider` updates a local React state (`stactionStateSnapshot`). This snapshot's primary role is to trigger re-renders in consuming components. The actual, canonical state always resides in `appStaction.state`.
3.  Components like `Counter` use `useStaction()` to get the Staction instance. They read `staction.state` for display and call `staction.actions` to dispatch changes.
4.  The component re-renders because `StactionProvider`'s `stactionStateSnapshot` changes, which is a result of Staction's `stateSetCallback` being invoked.

## 10. Best Practices

*   **Keep State Serializable:** While not strictly enforced, it's good practice to keep your state serializable (avoid storing functions, complex class instances, or non-plain objects directly in state if possible). This helps with debugging, persistence, and time-travel (if you implement it).
*   **Actions Should Be Descriptive:** Name your actions clearly to indicate what they do (e.g., `fetchUserProfile`, `addItemToCart`, `updateFormValidity`).
*   **Centralize Type Definitions:** For TypeScript projects, keep your `State` and `Actions` type definitions in a central place (e.g., `types.ts` or `state/types.ts`) for easy import.
*   **Handle Asynchronous Logic in Actions:** Actions are the place for `async/await`, `Promise` chains, and data fetching logic.
*   **Use Generators for Complex Flows:** When an operation involves multiple distinct state updates or depends on intermediate async results before proceeding, generators (especially async generators) can make the logic cleaner and more readable than complex Promise chains.
*   **Immutable Updates:** Always return a *new* state object from your actions (or parts of it that changed). Do not mutate `params.state()` directly. Use spread syntax (`...`) or tools like Immer if you prefer.
    ```javascript
    // Good:
    // return { ...state(), user: newUserData };

    // Bad:
    // const currentState = state();
    // currentState.user = newUserData; // Mutation!
    // return currentState;
    ```
*   **Error Handling:**
    *   Wrap `staction.init()` in a `try/catch`.
    *   Action calls (`staction.actions.yourAction()`) return Promises that can reject. Handle these rejections appropriately in your UI or calling logic.
    *   Inside actions, use `try/catch` for async operations that might fail (e.g., API calls) and update the state accordingly (e.g., set an error message in the state).
*   **Use `passed` for Ephemeral Data:** If an action needs to return temporary data that shouldn't live in the global state (e.g., a newly created ID, a success/failure status for a specific operation that the caller needs immediately), use the `passed` map.
*   **Middleware for Cross-Cutting Concerns:** Use middleware for logging, analytics, global error handling that modifies state (e.g., setting a global error message), or authentication checks. Avoid putting core business logic of a specific action into middleware.
*   **Consider `initFunc` for Complex Initial Setup:** If your application needs to fetch data or run several setup steps before it's ready, `initFunc` (especially an async one that calls actions) is a good place for this.

This guide should provide a solid foundation for using Staction. Refer to the `API_REFERENCE.md` for detailed information on specific methods and types.
Happy Stactioning! 