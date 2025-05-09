# Staction API Reference

This document provides a detailed API reference for the Staction library.

## Overview

Staction is a state management library that provides a clear and robust way to handle application state and actions. It supports synchronous and asynchronous operations, including Promises, Generators, and Async Generators, and offers strong TypeScript integration.

## `Staction<State, ActionsInput extends UserActions<State, ActionsInput>>` Class

The main class for creating and managing a Staction store.

-   `State`: The type of the state object managed by this Staction instance.
-   `ActionsInput`: An object type (e.g., `typeof myActionsObject`) representing the user-defined actions. It must conform to the `UserActions<State, ActionsInput>` structure, ensuring actions are well-typed for Staction processing.
-   `AuxData` (formerly `PassedMapType`, optional, defaults to `any`): While not a direct generic on the class instance itself for a global override, `AuxData` represents the type of auxiliary data an action can return. This type is defined on a per-action basis within the `ActionParams` (see below).

### Constructor

#### `new Staction<State, ActionsInput>()`

Creates a new Staction instance. You provide the `State` type and your specific `ActionsInput` type (which should extend `UserActions<State, YourActionsInputType>`).

### Properties (Getters)

#### `actions: WrappedActions<State, Actions, PassedMapType>`

An object containing the wrapped action methods. When an original action is called (e.g., `myAction(...args)`), the corresponding wrapped action (`staction.actions.myAction(...args)`) is invoked. These wrapped actions always return a Promise that resolves to an object `{ state: State, aux: AuxDataForThisAction | undefined }`, where `AuxDataForThisAction` is the specific auxiliary data type defined for that action.

#### `actions: StactionActions<State, ActionsInput>`

An object containing the wrapped action methods. When an original action is called (e.g., `myAction(...args)`), the corresponding wrapped action (`staction.actions.myAction(...args)`) is invoked. These wrapped actions always return a Promise that resolves to an object `{ state: State, aux: AuxDataForThisAction | undefined }`, where `AuxDataForThisAction` is the specific auxiliary data type defined for that action.

#### `state: State`

The current state of the Staction store. This is a read-only property reflecting the latest state after an action has completed.

#### `initialized: boolean`

A boolean getter that returns `true` if the Staction instance has been successfully initialized, `false` otherwise.

#### `initState: InitState`

A string getter indicating the current initialization state of the instance.
Possible values are:
-   `'uninitialized'`: `init()` has not been called.
-   `'initializing'`: `init()` is currently in progress.
-   `'initialized'`: `init()` has completed successfully.
-   `'initerror'`: An error occurred during initialization.

### Methods

#### `async init(actions: Actions, initFunc: (actions: WrappedActions<State, Actions, PassedMapType>) => Promise<State> | State, stateSetCallback: (state: State, actions: WrappedActions<State, Actions, PassedMapType>) => void): Promise<void>`

Initializes the Staction instance. This method is asynchronous and should typically be awaited.

-   `actions`: An object (`ActionsInput`) containing the action functions. These functions will be wrapped by Staction.
-   `initFunc`: A function that is called to set up the initial state.
    -   It receives the `staction.actions` (of type `StactionActions<State, ActionsInput>`) as an argument, allowing actions to be dispatched during initialization.
    -   It can be synchronous (returning `State`) or asynchronous (returning `Promise<State>`).
    -   The state returned by `initFunc` becomes the initial state of the store.
-   `stateSetCallback`: A function that is called every time the state is updated by an action (or by an action called within `initFunc`).
    -   It receives the `newState` and the `staction.actions` (of type `StactionActions<State, ActionsInput>`) as arguments.
    -   This is typically used to update UI components (e.g., calling `setState` in a React component).
    -   **Note**: This callback is *not* directly called with the result of `initFunc` itself, but rather by any actions that complete (including those potentially called *within* `initFunc` or by the final processing of a generator/promise returned by `initFunc` if it resolves to a state directly without actions).

#### `async init(actions: ActionsInput, initFunc: (actions: StactionActions<State, ActionsInput>) => Promise<State> | State, stateSetCallback: (state: State, actions: StactionActions<State, ActionsInput>) => void): Promise<void>`

Initializes the Staction instance. This method is asynchronous and should typically be awaited.

-   `actions`: An object (`ActionsInput`) containing the action functions. These functions will be wrapped by Staction.
-   `initFunc`: A function that is called to set up the initial state.
    -   It receives the `staction.actions` (of type `StactionActions<State, ActionsInput>`) as an argument, allowing actions to be dispatched during initialization.
    -   It can be synchronous (returning `State`) or asynchronous (returning `Promise<State>`).
    -   The state returned by `initFunc` becomes the initial state of the store.
-   `stateSetCallback`: A function that is called every time the state is updated by an action (or by an action called within `initFunc`).
    -   It receives the `newState` and the `staction.actions` (of type `StactionActions<State, ActionsInput>`) as arguments.
    -   This is typically used to update UI components (e.g., calling `setState` in a React component).
    -   **Note**: This callback is *not* directly called with the result of `initFunc` itself, but rather by any actions that complete (including those potentially called *within* `initFunc` or by the final processing of a generator/promise returned by `initFunc` if it resolves to a state directly without actions).

#### `getState(): State`

Returns the current state of the Staction store. Equivalent to accessing the `state` property.

#### `setMiddleware(middleware: StactionMiddleware[]): void`

Sets up middleware functions that can intercept actions. Middleware can be executed before (`pre`) or after (`post`) an action.

-   `middleware`: An array of `StactionMiddleware` objects.

#### `enableLogging(): string`

Enables logging of action calls to the console. Returns a confirmation message.

#### `disableLogging(): string`

Disables logging of action calls. Returns a confirmation message.

#### `enableStateWhenLogging(): void`

Includes the current state in the console logs when an action is called. Used in conjunction with `enableLogging()`.

#### `disableStateWhenLogging(): void`

Excludes the current state from console logs during action calls. Only the action name and arguments will be logged.

## Core Types

These are the primary types used when working with Staction, often imported from `staction` or `staction/dist/Staction.d.ts`.

### `ActionParams<State, Actions extends object, PassedMapType = Map<any, any>>`

The type of the first parameter passed to every action function.

-   `state: () => State`: A function that returns the current state. Call this function (`params.state()`) to get the up-to-date state within an action.
-   `actions: WrappedActions<State, Actions, PassedMapType>`: The same `wrappedActions` object available on `staction.actions`. This allows actions to call other actions.
-   `aux: AuxValueUpdater<AuxData>` (formerly `passed`): A function to set or update the auxiliary data for the current action.
    -   `valueOrUpdater`: Can be the `AuxData` value itself, or a function that receives the current `AuxData` (or `undefined` if not yet set) and should return the updated `AuxData` value. The `AuxData` type here is specific to the action being defined.
-   `name: string`: The name of the action currently being executed.

### `ActionParams<CurrentState, AllUserActions extends UserActions<CurrentState, AllUserActions>, AuxData = any>`

The type of the first parameter passed to every action function.

-   `state: () => CurrentState`: A function that returns the current state. Call this function (`params.state()`) to get the up-to-date state within an action.
-   `actions: StactionActions<CurrentState, AllUserActions>`: The `staction.actions` object, providing access to all wrapped actions. This allows actions to call other actions.
-   `aux: AuxValueUpdater<AuxData>`: A function to set or update the auxiliary data for the current action.
    -   `valueOrUpdater`: Can be the `AuxData` value itself, or a function that receives the current `AuxData` (or `undefined` if not yet set) and should return the updated `AuxData` value. The `AuxData` type here is specific to the action being defined.
-   `name: string`: The name of the action currently being executed.

### `WrappedActions<State, ActionsObject extends object, PassedMapType = Map<any, any>>`

The type of the `staction.actions` object. It mirrors the structure of the original `Actions` object provided to `init()`, but each action is wrapped.

-   `State`: The type of the application state.
-   `ActionsObject`: The original actions object type.
-   `PassedMapType`: The type of the "passed" map.

Each wrapped action takes the same arguments as the original action (excluding the initial `ActionParams` object) and returns `Promise<{ state: State, aux: AuxData_K | undefined }>`. `AuxData_K` is the auxiliary data type inferred or defined for that specific action `K`. If an action doesn't set any `aux` data, its `aux` property in the result will be `undefined`.

### `StactionActions<CurrentState, UserActionsObject extends UserActions<CurrentState, UserActionsObject>>`

The type of the `staction.actions` object. It mirrors the structure of the original `UserActionsObject` provided to `init()`, but each action is wrapped.

-   `CurrentState`: The type of the application state.
-   `UserActionsObject`: The original user-defined actions object type.

Each wrapped action takes the same arguments as the original action (excluding the initial `ActionParams` object) and returns `Promise<{ state: CurrentState, aux: AuxData_K | undefined }>`. `AuxData_K` is the auxiliary data type inferred or defined for that specific action `K`. If an action doesn't set any `aux` data, its `aux` property in the result will be `undefined`.

### `StactionMiddleware`

Defines the structure for a middleware object.

-   `type: 'pre' | 'post'`: Specifies whether the middleware runs before (`pre`) or after (`post`) the main action logic.
-   `method: Function`: The middleware function itself. It receives `StactionMiddlewareParams` as its argument.
    -   It can return a new state, a Promise resolving to a new state, a Generator yielding new states, or an AsyncGenerator yielding new states.
    -   If it returns `undefined` (and is not a Promise or Generator that might resolve to `undefined`), the current state is implicitly passed along.
-   `meta: object`: An arbitrary object for user-defined metadata, passed to the middleware method.

### `StactionMiddlewareParams<State, Meta = object>`

The type of the parameter passed to a middleware `method`.

-   `state: () => State`: A function that returns the current state at the time the middleware is invoked.
-   `name: string`: The name of the action being intercepted.
-   `args: any[]`: An array of arguments passed to the action.
-   `meta: Meta`: The `meta` object provided in the `StactionMiddleware` definition.

### `InitState`

A string literal type representing the initialization status of a Staction instance.

`type InitState = 'uninitialized' | 'initializing' | 'initialized' | 'initerror';`

## TypeScript Usage & Typing `AuxData`

Staction offers strong typing capabilities, especially for state and the auxiliary data (`aux`) returned by actions.

### Defining `AuxData` Per Action

The `AuxData` type, which defaults to `any`, can be specified for each action individually. This is done by providing the type as the third generic argument to `ActionParams` in your action's signature.

```typescript
import Staction, { ActionParams, UserActions } from 'staction'; // Adjust import path as needed

type MyState = {
  count: number;
  status?: string;
};

// Define AuxData types for specific actions
type IncrementAuxData = { by: number; timestamp: Date };
type StatusUpdateAuxData = { success: boolean; message?: string };

// It's a best practice to forward-declare your complete actions collection type
type MyActionCollection = {
  increment: (
    params: ActionParams<MyState, MyActionCollection, IncrementAuxData>,
    amount: number
  ) => MyState;
  setStatus: (
    params: ActionParams<MyState, MyActionCollection, StatusUpdateAuxData>,
    newStatus: string
  ) => Promise<MyState>;
  reset: (
    params: ActionParams<MyState, MyActionCollection> // No specific AuxData, defaults to 'any' for params.aux, result.aux will be undefined if not set
  ) => MyState;
};

const actionsImpl: MyActionCollection = {
  increment: ({ state, aux }, amount) => {
    aux({ by: amount, timestamp: new Date() });
    return { ...state(), count: state().count + amount };
  },
  setStatus: async ({ state, aux }, newStatus) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    if (newStatus === "error") {
      aux({ success: false, message: "Invalid status" });
      return state(); // Or throw an error
    }
    aux({ success: true });
    return { ...state(), status: newStatus };
  },
  reset: ({ state, aux }) => {
    // This action doesn't call aux(), so its aux result will be undefined.
    // The type of `aux` function inside params is (valueOrUpdater: any | ((currentValue: any | undefined) => any)) => void
    return { ...state(), count: 0, status: 'reset' };
  }
};

const staction = new Staction<MyState, MyActionCollection>();

// Initialization (example)
// staction.init(actionsImpl, () => ({ count: 0 }), (newState) => console.log(newState));

async function main() {
  // Assuming staction is initialized
  // await staction.init(actionsImpl, () => ({ count: 0 }), (newState) => {});


  const result1 = await staction.actions.increment(5);
  console.log(result1.state); // { count: 5 }
  console.log(result1.aux);   // { by: 5, timestamp: Date(...) }
  // result1.aux is typed as IncrementAuxData | undefined

  const result2 = await staction.actions.setStatus("active");
  console.log(result2.state); // { count: 5, status: 'active' }
  console.log(result2.aux);   // { success: true }
  // result2.aux is typed as StatusUpdateAuxData | undefined
  
  const result3 = await staction.actions.reset();
  console.log(result3.state); // { count: 0, status: 'reset' }
  console.log(result3.aux);   // undefined
  // result3.aux is typed as any | undefined because reset didn't specify AuxData,
  // and since it didn't call aux(), the value is undefined.
}
```

### Avoiding Circular Dependencies with Action Types

When defining types for your actions, especially the `actions` property within `ActionParams` (which refers to the entire collection of wrapped actions), TypeScript can sometimes run into issues with circular type dependencies. This was observed when trying to infer types too dynamically (e.g., `typeof actionsObject` within nested type definitions).

The recommended pattern to avoid this is:
1.  **Forward-declare your complete action collection type**: Before defining the implementation of your actions, declare a type that represents the entire collection (e.g., `MyActionCollection` in the example above).
2.  **Use this collection type consistently**:
    *   When typing the `params` for each action: `ActionParams<MyState, MyActionCollection, MySpecificAuxData>`.
    *   When typing your actions implementation object: `const myActionsImpl: MyActionCollection = { ... };`.
    *   When instantiating Staction: `new Staction<MyState, MyActionCollection>()`.

This approach provides TypeScript with a clear, non-circular path to resolve the types, ensuring that `params.actions` inside your action functions is correctly typed as `StactionActions<MyState, MyActionCollection>` and that the `AuxData` for each action is correctly inferred in the return type of `staction.actions.yourAction()`. 