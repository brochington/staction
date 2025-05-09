type TestSubject = {
  [Symbol.iterator]: string;
  [Symbol.asyncIterator]: string;
};

function isIterable(testSubject: TestSubject): boolean {
  return typeof testSubject[Symbol.iterator] === 'function';
}

function isAsyncIterable(testSubject: TestSubject) {
  return typeof testSubject[Symbol.asyncIterator] === 'function';
}

function isPromise(obj: any): obj is Promise<any> {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function'
  );
}

function isGeneratorFunction(testSub: any): boolean {
  return testSub && typeof testSub.next === 'function' && isIterable(testSub);
}

function isAsyncGeneratorFunction(testSub: any): boolean {
  return (
    testSub && typeof testSub.next === 'function' && isAsyncIterable(testSub)
  );
}

type WrappedActions<Actions, PassedMapType = Map<any, any>> = {
  [Action in keyof Actions]: Actions[Action] extends (
    params: any,
    ...args: infer Args
  ) => any
    ? (...args: Args) => Promise<{ state: any; passed: PassedMapType }>
    : never;
};

interface StactionMiddleware {
  type: 'pre' | 'post';
  method: Function;
  meta: object;
}

interface StactionMiddlewareParams<State, Meta = object> {
  state: () => State;
  name: string;
  args: any[];
  meta: Meta;
}

type InitState = 'uninitialized' | 'initializing' | 'initialized' | 'initerror';

class Staction<
  State,
  Actions extends { [s: string]: Function },
  PassedMapType = Map<any, any>
> {
  private _initState: InitState = 'uninitialized';
  //@ts-ignore
  private _actions: Actions; // used to keep reference of actions, so they aren't gc'ed.
  private _wrappedActions: WrappedActions<Actions, PassedMapType> =
    {} as WrappedActions<Actions, PassedMapType>;
  private _state: State = {} as State;
  private _stateSetCallback: Function = () => {};
  private _loggingEnabled: boolean = true;
  private _addStateToLogs: boolean = false;
  private _preMiddleware: StactionMiddleware[] = [];
  private _postMiddleware: StactionMiddleware[] = [];

  async init(
    actions: Actions,
    initFunc: (actions: WrappedActions<Actions, PassedMapType>) => Promise<State> | State,
    stateSetCallback: (state: State, actions: WrappedActions<Actions, PassedMapType>) => void
  ) {
    if (this._initState !== 'uninitialized') {
      let errorMsg = '';
      switch (this._initState) {
        case 'initialized':
          errorMsg = 'Staction instance has already been initialized';
          break;
        case 'initializing':
          errorMsg = 'Staction instance is currently being initialized';
          break;
        case 'initerror':
        default:
          errorMsg =
            'An error has previously occured when trying to init this instance';
          break;
      }
      const err = new Error(errorMsg);
      console.error(err); // Maintain original behavior of logging this type of error
      throw err; // Throw the error, _initState remains unchanged by this block
    }
    
    try {
      this._initState = 'initializing';

      /* set state callback, most likely a setState React method */
      this._stateSetCallback = stateSetCallback;
      
      /* wrap actions */
      this._wrappedActions = Object.entries(actions).reduce(
        (acc, [name, actionFunc]) => {
          acc[name] = (...args: any) =>
            this.actionWrapper(name, actionFunc, ...args);
          return acc;
        },
        {} as { [s: string]: Function }
      ) as WrappedActions<Actions, PassedMapType>;

      /* Keep reference to actions */
      this._actions = actions;


      /* Set initial state from init function, awaiting it if it's a promise */
      const initialStateCandidate = initFunc(this._wrappedActions);
      if (isPromise(initialStateCandidate)) {
        this._state = await initialStateCandidate;
      } else {
        this._state = initialStateCandidate;
      }

      this._initState = 'initialized';
      // Do NOT call _stateSetCallback here after init. It's called by actions.
    } catch (e) {
      // This catch is for errors during the actual initialization process
      this._initState = 'initerror';
      console.error(e);
      throw e;
    }
  }

  get actions(): WrappedActions<Actions, PassedMapType> {
    return this._wrappedActions;
  }

  get state(): State {
    return this._state;
  }

  get initialized(): boolean {
    return this._initState === 'initialized';
  }

  get initState(): InitState {
    return this._initState;
  }

  getState = (): State => {
    return this._state;
  };

  /* injects state and actions as args into actions that are called. */
  async actionWrapper(
    name: string,
    func: Function,
    ...args: any[]
  ): Promise<{ state: State; passed: PassedMapType }> {
    // call the action function with correct args.
    if (this._loggingEnabled) {
      if (this._addStateToLogs) {
        console.log('action: ', name, this._state);
      } else {
        console.log('action: ', name);
      }
    }

    let passedMap: PassedMapType = new Map() as PassedMapType;

    const updatePassedMap = (
      updater: PassedMapType | ((currentMap: PassedMapType) => PassedMapType)
    ) => {
      if (typeof updater === 'function') {
        passedMap = (updater as Function)(passedMap);
      } else {
        if (updater instanceof Map) {
          // Assuming updater is a Map, merge its contents
          for (const [key, value] of (updater as Map<any, any>).entries()) {
            (passedMap as Map<any, any>).set(key, value);
          }
        } else {
          throw new Error('Invalid updater type. Must be a function or a Map.');
        }
      }
    };

    const params = {
      state: this.getState,
      actions: this._wrappedActions,
      passed: updatePassedMap,
      name: name,
    };

    try {
      await this.processMiddleware(this._preMiddleware, name, args);

      const newState = func(params, ...args);

      await this.handleActionReturnTypes(newState);

      await this.processMiddleware(this._postMiddleware, name, args);

      if (!isGeneratorFunction(newState) && !isAsyncGeneratorFunction(newState)) {
        // setState callback is called whenever a generator function yields.
        // Or when a normal action/promise resolves.
        this.callSetStateCallback(this._state);
      }

      return { state: this._state, passed: passedMap };
    } catch (e) {
      throw e;
    }
  }

  /* handles standard values, promises (from async functions) and generator function return values */
  handleActionReturnTypes = async (newState: any): Promise<void> => {
    try {
      if (isPromise(newState)) {
        this._state = await newState;
      } else if (isGeneratorFunction(newState)) {
        let result = newState.next();
        while (!result.done) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
          result = newState.next();
        }
        // Process the final return value if it exists
        if (result.value !== undefined) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
        }
      } else if (isAsyncGeneratorFunction(newState)) {
        let result = await newState.next();
        while (!result.done) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
          result = await newState.next();
        }
        // Process the final return value
        if (result.value !== undefined) {
          await this.handleActionReturnTypes(result.value);
          this.callSetStateCallback(this._state);
        }
      } else {
        if (newState !== undefined) {
          this._state = newState;
        }
      }
    } catch (e) {
      throw e;
    }
  };

  processMiddleware = async (
    middleware: StactionMiddleware[],
    name: string,
    args: any[]
  ): Promise<void> => {
    for (const m of middleware) {
      if (typeof m.method === 'function') {
        const params: StactionMiddlewareParams<State> = {
          state: this.getState,
          name,
          args,
          meta: m.meta,
        };

        const mReturnedValue = m.method(params);
        let mStateToProcess;

        // If middleware returns raw undefined (not a promise/generator that might resolve to undefined),
        // interpret it as implicitly returning the current state, aligning with the philosophy
        // that middleware should always yield a state.
        if (mReturnedValue === undefined &&
            !isPromise(mReturnedValue) && // Redundant check if === undefined, but good for clarity
            !isGeneratorFunction(mReturnedValue) &&
            !isAsyncGeneratorFunction(mReturnedValue)) {
            mStateToProcess = params.state(); // Pass current state along
        } else {
            mStateToProcess = mReturnedValue;
        }

        await this.handleActionReturnTypes(mStateToProcess);
      }
    }
  };

  /* Calls the setState callback */
  callSetStateCallback = (newState: State) => {
    // call the callback specified in the init method.
    // NOTE: can do a check to see if state has been changed.
    this._state = newState;
    this._stateSetCallback(this._state, this._wrappedActions);
  };

  setMiddleware = (middleware: StactionMiddleware[]) => {
    const grouped = middleware.reduce<{ pre: StactionMiddleware[], post: StactionMiddleware[] }>((acc, mw) => {
      if (mw.type === 'pre') {
        acc.pre.push(mw);
      } else if (mw.type === 'post') {
        acc.post.push(mw);
      }
      return acc;
    }, { pre: [], post: [] });

    this._preMiddleware = grouped.pre;
    this._postMiddleware = grouped.post;
  };

  /* Debugging assist methods */
  enableLogging = () => {
    this._loggingEnabled = true;
    return `Staction logging is enabled`;
  };

  disableLogging = () => {
    this._loggingEnabled = false;
    return `Staction logging is disabled`;
  };

  disableStateWhenLogging = () => {
    this._addStateToLogs = false;
  };

  enableStateWhenLogging = () => {
    this._addStateToLogs = true;
  };
}

export default Staction;
