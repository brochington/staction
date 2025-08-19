import type {
  InitState,
  UserActions,
  StactionActions,
  StactionMiddlewareParams,
} from './Staction.d';

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

interface StactionMiddleware {
  type: 'pre' | 'post';
  method: Function;
  meta: object;
}

class Staction<State, ActionsInput extends UserActions<State, ActionsInput>> {
  private _initState: InitState = 'uninitialized';
  private _actions!: ActionsInput;

  private _wrappedActions: StactionActions<State, ActionsInput> = {} as any;

  private _state: State = {} as State;
  private _stateSetCallback: Function = () => {};
  private _loggingEnabled: boolean = true;
  private _addStateToLogs: boolean = false;
  private _preMiddleware: StactionMiddleware[] = [];
  private _postMiddleware: StactionMiddleware[] = [];

  async init(
    actions: ActionsInput,
    initFunc: (
      actions: StactionActions<State, ActionsInput>
    ) => Promise<State> | State,
    stateSetCallback: (
      state: State,
      actions: StactionActions<State, ActionsInput>
    ) => void
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

      throw err;
    }

    try {
      this._initState = 'initializing';
      this._stateSetCallback = stateSetCallback;

      this._wrappedActions = Object.entries(actions).reduce(
        (acc, [name, actionFunc]) => {
          (acc as any)[name as keyof ActionsInput] = (...args: any[]) =>
            this.actionWrapper(name, actionFunc as Function, ...args);
          return acc;
        },
        {} as StactionActions<State, ActionsInput>
      );

      this._actions = actions;
      const initialStateCandidate = initFunc(this._wrappedActions as any);
      if (isPromise(initialStateCandidate)) {
        this._state = await initialStateCandidate;
      } else {
        this._state = initialStateCandidate;
      }

      this._initState = 'initialized';
    } catch (e) {
      this._initState = 'initerror';
      console.error(e);
      throw e;
    }
  }

  get actions(): StactionActions<State, ActionsInput> {
    return this._wrappedActions;
  }

  get state(): State {
    // console.log('state: ', this._state?.toJS());
    return this._state;
  }

  get initialized(): boolean {
    return this._initState === 'initialized';
  }

  get initState(): InitState {
    return this._initState;
  }

  getState = (): State => {
    // console.log('getState: ', this._state?.toJS());
    return this._state;
  };

  async actionWrapper(
    name: string,
    func: Function,
    ...args: any[]
  ): Promise<{ state: State; aux: any | undefined }> {
    if (this._loggingEnabled) {
      if (this._addStateToLogs) {
        console.log('action: ', name, this._state);
      } else {
        console.log('action: ', name);
      }
    }

    let auxData: any | undefined = undefined;

    const updateAuxData = (
      valueOrUpdater: any | ((currentValue: any | undefined) => any)
    ) => {
      if (typeof valueOrUpdater === 'function') {
        auxData = (valueOrUpdater as Function)(auxData);
      } else {
        auxData = valueOrUpdater;
      }
    };

    const params = {
      state: this.getState,
      actions: this._wrappedActions as any,
      aux: updateAuxData,
      name: name,
    };

    try {
      await this.processMiddleware(this._preMiddleware, name, args);
      const newState = func(params, ...args);
      await this.handleActionReturnTypes(newState);
      await this.processMiddleware(this._postMiddleware, name, args);

      if (
        !isGeneratorFunction(newState) &&
        !isAsyncGeneratorFunction(newState)
      ) {
        this.callSetStateCallback();
      }

      return { state: this._state, aux: auxData };
    } catch (e) {
      throw e;
    }
  }

  handleActionReturnTypes = async (result: any): Promise<void> => {
    try {
      if (isPromise(result)) {
        const resolvedValue = await result;
        await this.handleActionReturnTypes(resolvedValue);
      } else if (isGeneratorFunction(result)) {
        let genResult = result.next();
        while (!genResult.done) {
          await this.handleActionReturnTypes(genResult.value);
          this.callSetStateCallback();
          genResult = result.next();
        }
        if (genResult.value !== undefined) {
          await this.handleActionReturnTypes(genResult.value);
          this.callSetStateCallback();
        }
      } else if (isAsyncGeneratorFunction(result)) {
        let genResult = await result.next();
        while (!genResult.done) {
          await this.handleActionReturnTypes(genResult.value);
          this.callSetStateCallback();
          genResult = await result.next();
        }
        if (genResult.value !== undefined) {
          await this.handleActionReturnTypes(genResult.value);
          this.callSetStateCallback();
        }
      } else if (
        typeof result === 'function' &&
        !isGeneratorFunction(result) &&
        !isAsyncGeneratorFunction(result)
      ) {
        const newState = result(this._state);
        if (newState !== undefined) {
          this._state = newState;
        }
      } else {
        // This handles plain state objects and other values.
        if (result !== undefined) {
          this._state = result;
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

        await this.handleActionReturnTypes(mReturnedValue);
      }
    }
  };

  callSetStateCallback = () => {
    this._stateSetCallback(this._state, this._wrappedActions as any);
  };

  setMiddleware = (middleware: StactionMiddleware[]) => {
    const grouped = middleware.reduce<{
      pre: StactionMiddleware[];
      post: StactionMiddleware[];
    }>(
      (acc, mw) => {
        if (mw.type === 'pre') {
          acc.pre.push(mw);
        } else if (mw.type === 'post') {
          acc.post.push(mw);
        }
        return acc;
      },
      { pre: [], post: [] }
    );

    this._preMiddleware = grouped.pre;
    this._postMiddleware = grouped.post;
  };

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
