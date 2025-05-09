# Staction

A straightforward, powerful, and modern method for managing state in JavaScript and TypeScript applications. Staction supports Promises, Generators, Async/Await, and Async Generators (asyncIterable) out of the box, providing a flexible way to handle both simple and complex state logic.

Because sometimes, all you really need is well-managed state and clearly defined actions.

**Key Features:**

*   **Simple & Predictable:** Clear separation of state and actions.
*   **Async Powerhouse:** Seamlessly handle asynchronous operations with Promises, `async/await`, Generators, and Async Generators.
*   **TypeScript First:** Excellent TypeScript support for robust, type-safe state management.
*   **Middleware:** Extend functionality with `pre` and `post` action middleware for logging, API calls, etc.
*   **Auxiliary Data (`aux`):** Actions can return custom auxiliary data alongside state changes. This data can be of any type and is defined per action, perfect for things like new IDs, operation-specific status messages, or metadata.
*   **Lightweight:** No unnecessary boilerplate, keeping your focus on your application logic.

## Quick Links

*   **[Full Usage Guide](./USAGE_GUIDE.md)**: Comprehensive guide with examples and best practices.
*   **[API Reference](./API_REFERENCE.md)**: Detailed API documentation.

## Basic Usage (TypeScript)

```typescript
import Staction, { ActionParams } from 'staction';

// 1. Define your State and Actions types
type AppState = {
  count: number;
  lastMessage?: string;
};

// Optional: Define AuxData types for specific actions if they use `aux`
type IncrementAux = { incrementedBy: number; timestamp: number };
type SetMessageAux = { messageLength: number; setAt: number };

// Define your action signatures
type AppActions = {
  increment: (params: ActionParams<AppState, AppActions, IncrementAux>, amount?: number) => AppState;
  setMessage: (params: ActionParams<AppState, AppActions, SetMessageAux>, newMessage: string) => Promise<AppState>;
};

// 2. Create a Staction instance
const staction = new Staction<AppState, AppActions>();

// 3. Implement your actions
const actionsImpl: AppActions = {
  increment: ({ state, aux }, amount = 1) => {
    aux({ incrementedBy: amount, timestamp: Date.now() });
    return { ...state(), count: state().count + amount };
  },
  setMessage: async ({ state, aux }, newMessage) => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async work
    aux({ messageLength: newMessage.length, setAt: Date.now() });
    return { ...state(), lastMessage: newMessage };
  },
};

// 4. Define your initial state function
const getInitialState = (/* wrappedActions */): AppState => {
  // You can use wrappedActions here if needed for initial setup actions
  return { count: 0 };
};

// 5. Define your state update callback (e.g., for React setState)
const onStateUpdate = (newState: AppState, wrappedActions: AppActions) => {
  console.log('State Updated:', newState);
  // In React: setCurrentAppState(newState);
  // wrappedActions are the same as staction.actions, useful for triggering follow-up actions from callback if necessary
};

// 6. Initialize Staction (it's async!)
async function main() {
  try {
    console.log('Initializing Staction...', staction.initState);
    await staction.init(actionsImpl, getInitialState, onStateUpdate);
    console.log('Staction Initialized! Current State:', staction.state);
    console.log('Is initialized:', staction.initialized);

    // 7. Dispatch actions
    const { state: stateAfterIncrement, aux: auxFromIncrement } = await staction.actions.increment(5);
    console.log('After increment:', stateAfterIncrement);
    console.log('Aux data from increment:', auxFromIncrement?.incrementedBy); // 5

    const { state: stateAfterMessage, aux: auxFromMessage } = await staction.actions.setMessage('Hello Staction!');
    console.log('After setMessage:', stateAfterMessage);
    console.log('Message set timestamp:', auxFromMessage?.setAt);

    console.log('Final state from instance:', staction.state); // Access current state directly

  } catch (error) {
    console.error('Error during Staction setup or action:', error);
    console.error('Staction initialization state:', staction.initState);
  }
}

main();
```

## Actions

Actions are the core of state changes in Staction. They can be plain functions, async functions, or even generator functions (both sync and async).

*   **Return Value:** Actions should always yield or return data that Staction can use to determine the new state (or a Promise that resolves to it).
*   **`params` Object:** The first argument to every action is a `params` object containing:
    *   `state: () => State`: A function to get the current state.
    *   `actions: WrappedActions`: Access to other actions.
    *   `aux: (valueOrUpdater) => void`: Function to set or update the auxiliary data for the action. Its type depends on the `AuxData` defined for the action.
    *   `name: string`: The name of the current action.

For a deep dive into actions, including handling different return types (Promises, Generators, Async Generators), see the [**Actions In-Depth section in the Usage Guide**](./USAGE_GUIDE.md#actions-in-depth).

## TypeScript

Staction is built with TypeScript and offers robust typing. Define types for your `State` and `Actions`. Auxiliary data (`AuxData`) types are defined on a per-action basis within `ActionParams` for a fully type-safe experience.

Refer to the [**TypeScript Usage section in the Usage Guide**](./USAGE_GUIDE.md#typescript-usage) for detailed examples.

## With React (and TypeScript)

A common pattern involves using React Context to provide the Staction instance to your component tree.

See the [**React Integration Example in the Usage Guide**](./USAGE_GUIDE.md#react-integration-example-typescript) for a complete example.

## Staction Instance API Highlights

Once you have `const staction = new Staction<MyState, MyActions>()`:

*   **`staction.init(actions, initFunc, stateSetCallback)`**: (Async) Initializes the store. See [Initialization Lifecycle](./USAGE_GUIDE.md#initialization-lifecycle).
*   **`staction.actions`**: An object containing your wrapped actions. Calling `staction.actions.myAction(...args)` returns `Promise<{ state: NewState, aux: AuxDataForThatAction | undefined }>`.
*   **`staction.state`**: The current, read-only state.
*   **`staction.getState()`**: Method to get the current state.
*   **`staction.initialized`**: Boolean getter, `true` if init was successful.
*   **`staction.initState`**: String getter for detailed initialization status (`'uninitialized'`, `'initializing'`, `'initialized'`, `'initerror'`).
*   **Logging Methods**: `enableLogging()`, `disableLogging()`, `enableStateWhenLogging()`, `disableStateWhenLogging()`.
*   **`staction.setMiddleware(middlewares)`**: Add `pre` or `post` action middleware.

For the complete list of methods and properties, check the [**API Reference**](./API_REFERENCE.md).

## Middleware

Extend Staction's functionality using middleware. Middleware functions can run before (`pre`) or after (`post`) an action, allowing you to log, modify state, or trigger side effects.

```javascript
const myMiddleware = {
  type: 'pre', // or 'post'
  method: ({ state, name, args, meta }) => {
    console.log(`Action '${name}' is about to run.`);
    // Middleware can also return new state, Promises, or be generators
  },
  meta: { /* your custom metadata */ }
};

staction.setMiddleware([myMiddleware]);
```

Learn more about [**Middleware in the Usage Guide**](./USAGE_GUIDE.md#middleware).

## Further Information

*   **[Full Usage Guide](./USAGE_GUIDE.md)**: For comprehensive explanations, examples, and best practices.
*   **[API Reference](./API_REFERENCE.md)**: For detailed information on all classes, methods, and types.

Contributions, issues, and feature requests are welcome!
