# Staction API Reference

This document provides a detailed API reference for the Staction library.

## Overview

Staction is a state management library that provides a clear and robust way to handle application state and actions. It supports synchronous and asynchronous operations, including Promises, Generators, and Async Generators, and offers strong TypeScript integration.

## `Staction<State, Actions, PassedMapType>` Class

The main class for creating and managing a Staction store.

-   `State`: The type of the state object managed by this Staction instance.
-   `Actions`: An object type where keys are action names and values are action functions.
-   `PassedMapType` (optional, defaults to `Map<any, any>`): The type of the map used for the "passed" functionality, allowing actions to return auxiliary data alongside state.

### Constructor

#### `new Staction<State, Actions, PassedMapType>()`

Creates a new Staction instance.

### Properties (Getters)

#### `actions: WrappedActions<State, Actions, PassedMapType>`

An object containing the wrapped action methods. When an original action is called (e.g., `myAction(...args)`), the corresponding wrapped action (`staction.actions.myAction(...args)`) is invoked. These wrapped actions always return a Promise that resolves to an object `{ state: State, passed: PassedMapType }`.

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

-   `actions`: An object containing the action functions. These functions will be wrapped by Staction.
-   `initFunc`: A function that is called to set up the initial state.
    -   It receives the `wrappedActions` as an argument, allowing actions to be dispatched during initialization.
    -   It can be synchronous (returning `State`) or asynchronous (returning `Promise<State>`).
    -   The state returned by `initFunc` becomes the initial state of the store.
-   `stateSetCallback`: A function that is called every time the state is updated by an action (or by an action called within `initFunc`).
    -   It receives the `newState` and the `wrappedActions` as arguments.
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
-   `passed: (updater: PassedMapType | ((currentMap: PassedMapType) => PassedMapType)) => void`: A function to update the "passed" map for the current action.
    -   `updater`: Can be a `PassedMapType` instance (its entries will be merged into the current action's passed map) or a function that receives the current passed map and should return the updated map.
-   `name: string`: The name of the action currently being executed.

### `WrappedActions<State, ActionsObject extends object, PassedMapType = Map<any, any>>`

The type of the `staction.actions` object. It mirrors the structure of the original `Actions` object provided to `init()`, but each action is wrapped.

-   `State`: The type of the application state.
-   `ActionsObject`: The original actions object type.
-   `PassedMapType`: The type of the "passed" map.

Each wrapped action takes the same arguments as the original action (excluding the initial `ActionParams` object) and returns `Promise<{ state: State, passed: PassedMapType }>`.

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