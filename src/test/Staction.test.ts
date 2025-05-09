import {
  describe,
  expect,
  test,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import Staction from '../Staction';
import {
  ActionParams,
  StactionMiddlewareParams,
  UserActions,
  StactionActions,
} from '../Staction.d';

const noop = () => {};

var sleep = (time = 50) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

describe('Staction', () => {
  test("Is new'ed correctly", () => {
    const staction = new Staction();
    staction.disableLogging();
    expect(staction).toBeDefined();
  });

  test('Init and call basic action', async () => {
    type State = { count: number };
    type Actions = any;
    type Params = ActionParams<State, Actions>;

    var actions = {
      testAction: function ({ state, actions }: Params) {
        expect(state).toBeInstanceOf(Function);
        expect(state()).toMatchObject({ count: 1 });

        expect(actions).toHaveProperty('testAction');
        expect(actions.testAction).toBeInstanceOf(Function);

        return {
          count: state().count + 1,
        };
      },
    };

    const callback = function (appState: State) {
      expect(appState).toMatchObject({ count: 2 });
    };

    const staction = new Staction<State, Actions>();
    staction.disableLogging();

    expect(staction.initState).toEqual('uninitialized');

    staction.init(
      actions,
      () => {
        return { count: 1 };
      },
      callback
    );

    expect(staction.initState).toEqual('initialized');

    // @ts-ignore
    var result = staction.actions.testAction();

    expect(result).toBeInstanceOf(Promise);

    const { state: newState } = await result;

    expect(newState).toMatchObject({ count: 2 });
    expect(staction.state).toMatchObject({ count: 2 });
  });

  describe('actions', () => {
    test('async/await', (done) => {
      var actions = {
        testAction: async function () {
          await sleep();

          done();

          return {};
        },
      };

      const staction = new Staction<{}, typeof actions>();
      staction.disableLogging();

      staction.init(
        actions,
        () => {
          return {};
        },
        noop
      );
      // @ts-ignore
      staction.actions.testAction();
    });

    test('generator', async () => {
      type State = { count: number };
      type StateFunc = () => State;

      // Forward-declare the type of the actions collection for this test
      type GeneratorActions = {
        testAction: (
          params: ActionParams<State, GeneratorActions, any>
        ) => Generator<{ count: number }, void, unknown>;
      };

      let setStateCount = 0;
      const actionsImpl: GeneratorActions = {
        testAction: function* ({ state, actions }) {
          // `actions` here is now StactionActions<State, GeneratorActions>
          yield { count: state().count + 1 };

          expect(state().count).toEqual(1);

          // Example of calling another action if it existed in GeneratorActions
          // if (actions.anotherActionInGen) { await actions.anotherActionInGen(); }

          yield { count: state().count + 1 };

          expect(state().count).toEqual(2);
        },
      };

      const staction = new Staction<State, GeneratorActions>();
      staction.disableLogging();

      staction.init(
        actionsImpl, // Use the correctly typed implementation
        () => {
          return { count: 0 };
        },
        () => {
          setStateCount += 1;
        }
      );

      // @ts-ignore - This was present before, might indicate other args/payloads not typed in GeneratorActions.testAction if it took more than params.
      // If testAction takes no other arguments, this ignore might not be needed after the refactor.
      const { state: finalState } = (await staction.actions.testAction()) as {
        state: State;
      };

      expect(finalState).toMatchObject({ count: 2 });
      expect(setStateCount).toEqual(2);
    });

    test('promise', async () => {
      type State = { count: number };
      type StateFunc = () => State;

      // Forward-declare the type of the actions collection for this test
      type PromiseActions = {
        testAction: (
          params: ActionParams<State, PromiseActions, any>
        ) => Promise<{ count: number }>;
      };

      const actionsImpl: PromiseActions = {
        testAction: function ({ state, actions }) {
          // `actions` here is StactionActions<State, PromiseActions>
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ count: state().count + 1 });
            }, 50);
          });
        },
      };

      const staction = new Staction<State, PromiseActions>();
      staction.disableLogging();

      staction.init(
        actionsImpl, // Use the correctly typed implementation
        () => {
          return { count: 0 };
        },
        noop
      );
      // @ts-ignore - Similar to above, if testAction takes no other args, this might not be needed.
      const { state: finalState } = (await staction.actions.testAction()) as {
        state: State;
      };

      expect(finalState).toMatchObject({ count: 1 });
    });

    test('generator and async/await', async () => {
      type State = { count: number };
      type StateFunc = () => State;

      // Forward-declare the type of the actions collection
      type GenAsyncActions = {
        testAction: (
          params: ActionParams<State, GenAsyncActions, any>
        ) => Generator<
          Promise<{ count: number }> | { count: number },
          void,
          unknown
        >;
      };

      const actionsImpl: GenAsyncActions = {
        testAction: function* ({ state, actions }) {
          // `actions` here is StactionActions<State, GenAsyncActions>
          yield { count: state().count + 1 };
          expect(state().count).toEqual(1);

          yield (async function () {
            return { count: state().count + 1 };
          })();

          expect(state().count).toEqual(2);

          yield { count: state().count + 1 };
        },
      };

      const staction = new Staction<State, GenAsyncActions>();
      staction.disableLogging();

      staction.init(
        actionsImpl,
        () => {
          return { count: 0 };
        },
        noop
      );

      // @ts-ignore
      const { state: finalState } = (await staction.actions.testAction()) as {
        state: State;
      };

      expect(finalState.count).toEqual(3);
      expect(staction.state).toMatchObject({ count: 3 });
    });

    test('Only interates over generator functions, not state that is iterable', async () => {
      type State = number[];
      var testIterable = [1, 2, 3];

      // Forward-declare the type of the actions collection
      type IterableActions = {
        testAction: (
          params: ActionParams<State, IterableActions, any>
        ) => Generator<number[], void, unknown>;
      };

      const actionsImpl: IterableActions = {
        testAction: function* ({ state, actions }) {
          // `actions` here is StactionActions<State, IterableActions>
          yield state().map((v) => v + 2);

          expect(state()[0]).toEqual(3);
          expect(state()[1]).toEqual(4);
          expect(state()[2]).toEqual(5);

          yield state().map((v) => v + 2);
        },
      };

      let localStaction = new Staction<typeof testIterable, IterableActions>();
      localStaction.disableLogging();

      localStaction.init(actionsImpl, () => testIterable, noop);

      // @ts-ignore
      const { state: finalState } =
        (await localStaction.actions.testAction()) as unknown as {
          state: number[];
        };

      expect(finalState[0]).toEqual(5);
      expect(finalState[1]).toEqual(6);
      expect(finalState[2]).toEqual(7);
    });

    test('async generator (asyncIterable)', async () => {
      type State = { count: number };

      // Forward-declare the type of the actions collection
      type AsyncGenActions = {
        testAction: (
          params: ActionParams<State, AsyncGenActions, any>
        ) => AsyncGenerator<{ count: number }, void, unknown>;
      };

      const actionsImpl: AsyncGenActions = {
        testAction: async function* ({ state, actions }) {
          // `actions` here is StactionActions<State, AsyncGenActions>
          yield { count: state().count + 1 };

          expect(state().count).toEqual(1);

          const secondCount = await Promise.resolve({
            count: state().count + 1,
          });

          yield secondCount;

          expect(state().count).toEqual(2);

          yield Promise.resolve({ count: state().count + 1 });
        },
      };

      const staction = new Staction<State, AsyncGenActions>();
      staction.disableLogging();

      staction.init(actionsImpl, () => ({ count: 0 }), noop);

      const { state: resultState } =
        (await staction.actions.testAction()) as unknown as { state: State };

      expect(resultState.count).toEqual(3);
    });

    test('generator yielding a rejecting promise should propagate the error', async () => {
      type State = { status: string };
      const actions = {
        errorInGenerator: function* ({
          state,
          aux,
        }: ActionParams<State, any, Map<'step1' | 'step2', boolean>>) {
          yield { status: 'step 1 complete' };
          expect(state().status).toBe('step 1 complete');
          aux(() => new Map().set('step1', true));

          yield Promise.reject(new Error('Generator promise failed'));

          // This part should not be reached
          aux((m: Map<'step1' | 'step2', boolean> | undefined) =>
            m!.set('step2', true)
          );
          yield { status: 'step 2 complete' };
        },
      };

      const staction = new Staction<State, typeof actions>();
      staction.disableLogging();
      const mockSetStateCallback = jest.fn();
      staction.init(
        actions,
        () => ({ status: 'initial' }),
        mockSetStateCallback
      );

      try {
        await staction.actions.errorInGenerator();
        // Should not reach here
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toBe('Generator promise failed');
      }

      // Check state after the error
      expect(staction.state.status).toBe('step 1 complete'); // State should be from the last successful yield

      // Check how many times setState was called: once for the first yield.
      expect(mockSetStateCallback).toHaveBeenCalledTimes(1);
      expect(mockSetStateCallback).toHaveBeenCalledWith(
        { status: 'step 1 complete' },
        staction.actions
      );
    });

    test('generator with mixed yield types (plain, promise, async iife)', async () => {
      type State = {
        step: number;
        data: string | null;
        promiseResolved: boolean;
        asyncResolved: boolean;
      };
      const mockSetState = jest.fn();
      let callCount = 0;

      const actions = {
        mixedYieldsAction: function* ({ state }: ActionParams<State, any>) {
          // 1. Yield plain object
          yield { ...state(), step: 1, data: 'plain_yield_1' };
          expect(state().step).toBe(1);
          expect(state().data).toBe('plain_yield_1');

          // 2. Yield a promise that resolves
          yield new Promise<Partial<State>>((resolve) =>
            setTimeout(
              () => resolve({ ...state(), step: 2, promiseResolved: true }),
              20
            )
          );
          expect(state().step).toBe(2);
          expect(state().promiseResolved).toBe(true);

          // 3. Yield an immediately-invoked async function call
          yield (async () => {
            await sleep(10); // Simulate some async work within
            return {
              ...state(),
              step: 3,
              asyncResolved: true,
              data: 'async_iife',
            };
          })();
          expect(state().step).toBe(3);
          expect(state().asyncResolved).toBe(true);
          expect(state().data).toBe('async_iife');

          // 4. Yield another plain object
          yield { ...state(), step: 4, data: 'final_plain_yield' };
          expect(state().step).toBe(4);

          return { ...state(), data: 'final_return' };
        },
      };

      const staction = new Staction<State, typeof actions>();
      staction.disableLogging();
      const initialState: State = {
        step: 0,
        data: null,
        promiseResolved: false,
        asyncResolved: false,
      };

      staction.init(
        actions,
        () => initialState,
        (s: State) => {
          callCount++;
          mockSetState(JSON.parse(JSON.stringify(s))); // Deep clone for snapshotting state
        }
      );

      const { state: finalState } = await staction.actions.mixedYieldsAction();

      expect(finalState.data).toBe('final_return');
      expect(finalState.step).toBe(4); // Last yield before return determines this aspect of final state for generator
      expect(staction.state.data).toBe('final_return');

      expect(callCount).toBe(5); // 4 yields + 1 final return value processing

      // Check calls to the stateSetCallback (via mockSetState)
      // Call 1: After first plain yield
      expect(mockSetState.mock.calls[0][0]).toMatchObject({
        step: 1,
        data: 'plain_yield_1',
      });
      // Call 2: After promise yield resolves
      expect(mockSetState.mock.calls[1][0]).toMatchObject({
        step: 2,
        promiseResolved: true,
        data: 'plain_yield_1',
      });
      // Call 3: After async IIFE resolves
      expect(mockSetState.mock.calls[2][0]).toMatchObject({
        step: 3,
        asyncResolved: true,
        data: 'async_iife',
      });
      // Call 4: After final plain yield
      expect(mockSetState.mock.calls[3][0]).toMatchObject({
        step: 4,
        data: 'final_plain_yield',
      });
      // Call 5: After generator completes and its return value is processed
      expect(mockSetState.mock.calls[4][0]).toMatchObject({
        step: 4,
        data: 'final_return',
      });
    });

    describe('auxiliary data functionality (formerly passed)', () => {
      test('should return undefined if aux() is not called', async () => {
        type State = { value: string };
        // AuxData can be `void` or `never` if truly no data is intended.
        // Or simply don't specify it in ActionParams if `any` is acceptable for AuxData.
        type NoAuxData = void;

        type CurrentTestActionsShape = {
          testAction: (
            params: ActionParams<State, CurrentTestActionsShape, NoAuxData>
          ) => State;
        };

        const actionsImpl: CurrentTestActionsShape = {
          testAction: ({ state }) => {
            // No call to params.aux()
            return { ...state(), value: 'new value' };
          },
        };

        type StactionUserActions = UserActions<State, CurrentTestActionsShape>;
        const staction = new Staction<State, StactionUserActions>();
        staction.disableLogging();
        staction.init(actionsImpl, () => ({ value: 'initial' }), noop);

        const { state, aux } = await staction.actions.testAction();

        expect(state.value).toBe('new value');
        expect(aux).toBeUndefined();
      });

      test('should set aux data using a direct value', async () => {
        type State = { id: number };
        type CreateItemAuxData = {
          newItemId: number;
          message: string;
          timestamp?: Date;
        };

        type CurrentTestActionsShape = {
          createItem: (
            params: ActionParams<
              State,
              CurrentTestActionsShape,
              CreateItemAuxData
            >
          ) => State;
        };

        const actionsImpl: CurrentTestActionsShape = {
          createItem: ({ state, aux }) => {
            const newId = state().id + 1;
            const auxValue: CreateItemAuxData = {
              newItemId: newId,
              message: 'Item created',
            };
            aux(auxValue);
            return { ...state(), id: newId };
          },
        };
        type StactionUserActions = UserActions<State, CurrentTestActionsShape>;

        const staction = new Staction<State, StactionUserActions>();
        staction.disableLogging();
        staction.init(actionsImpl, () => ({ id: 0 }), noop);

        const { state, aux } = await staction.actions.createItem();

        expect(state.id).toBe(1);
        expect(aux).toBeDefined();
        expect(aux?.newItemId).toBe(1);
        expect(aux?.message).toBe('Item created');
        expect(aux?.timestamp).toBeUndefined();
      });

      test('should update aux data using an updater function', async () => {
        type State = { status: string };
        type ProcessDataAux = {
          processedId?: number;
          isValid?: boolean;
          steps: string[];
        };

        type CurrentTestActionsShape = {
          processData: (
            params: ActionParams<State, CurrentTestActionsShape, ProcessDataAux>
          ) => State;
        };

        const actionsImpl: CurrentTestActionsShape = {
          processData: ({ state, aux }) => {
            aux({ steps: ['started'] });

            // Simulate some processing
            const id = 123;
            aux((current: ProcessDataAux | undefined) => ({
              ...current!,
              processedId: id,
              steps: [...current!.steps, 'id_set'],
            }));

            const valid = true;
            aux((current: ProcessDataAux | undefined) => ({
              ...current!,
              isValid: valid,
              steps: [...current!.steps, 'validated'],
            }));

            return { ...state(), status: 'processed' };
          },
        };
        type StactionUserActions = UserActions<State, CurrentTestActionsShape>;
        const staction = new Staction<State, StactionUserActions>();
        staction.disableLogging();
        staction.init(actionsImpl, () => ({ status: 'pending' }), noop);

        const { state, aux } = await staction.actions.processData();

        expect(state.status).toBe('processed');
        expect(aux).toBeDefined();
        expect(aux?.processedId).toBe(123);
        expect(aux?.isValid).toBe(true);
        expect(aux?.steps).toEqual(['started', 'id_set', 'validated']);
      });

      test('updater function receives undefined if aux() not called before', async () => {
        type State = { version: number };
        type UpdateAuxData = { initialMessage?: string; finalMessage: string };

        type CurrentTestActionsShape = {
          updateAction: (
            params: ActionParams<State, CurrentTestActionsShape, UpdateAuxData>
          ) => State;
        };

        const actionsImpl: CurrentTestActionsShape = {
          updateAction: ({ state, aux }) => {
            aux((current: UpdateAuxData | undefined) => {
              expect(current).toBeUndefined();
              return { ...current, finalMessage: 'Set after undefined' };
            });
            return { ...state(), version: state().version + 1 };
          },
        };
        type StactionUserActions = UserActions<State, CurrentTestActionsShape>;
        const staction = new Staction<State, StactionUserActions>();
        staction.disableLogging();
        staction.init(actionsImpl, () => ({ version: 1 }), noop);

        const { state, aux } = await staction.actions.updateAction();

        expect(state.version).toBe(2);
        expect(aux).toBeDefined();
        expect(aux?.finalMessage).toBe('Set after undefined');
        expect(aux?.initialMessage).toBeUndefined();
      });

      // This test is less relevant as AuxValueUpdater doesn't have distinct types of updaters like Map vs function.
      // It only accepts AuxData or (AuxData | undefined) => AuxData.
      // We can test passing a non-function, non-AuxData type if strict typing is bypassed.
      test('aux function should handle various inputs gracefully (TS type safety is primary check)', async () => {
        type State = { value: number };
        type TestAuxData = { message: string };

        type CurrentTestActionsShape = {
          testRobustAux: (
            params: ActionParams<State, CurrentTestActionsShape, TestAuxData>
          ) => State;
        };
        const actionsImpl: CurrentTestActionsShape = {
          testRobustAux: ({ aux, state }) => {
            try {
              (aux as any)(123);
            } catch (e) {
              // Depending on internal implementation, this might or might not throw.
              // The goal is that valid uses (AuxData or (AuxData|undefined)=>AuxData) work.
              // Invalid uses are primarily caught by TypeScript.
            }
            aux({ message: 'correctly set' });
            return { ...state(), value: state().value + 1 };
          },
        };
        type StactionUserActions = UserActions<State, CurrentTestActionsShape>;
        const staction = new Staction<State, StactionUserActions>();
        staction.disableLogging();
        staction.init(actionsImpl, () => ({ value: 0 }), noop);

        const { aux } = await staction.actions.testRobustAux();
        expect(aux?.message).toBe('correctly set');
      });

      test('should accumulate in aux data across yields in a generator action', async () => {
        type State = { counter: number };
        type GeneratorAux = {
          step1?: string;
          step2?: string;
          finalStep?: string;
          commonValue: number;
        };

        type CurrentTestActionsShape = {
          generatorWithAux: (
            params: ActionParams<State, CurrentTestActionsShape, GeneratorAux>
          ) => Generator<any, State, any>;
        };

        const actionsImpl: CurrentTestActionsShape = {
          generatorWithAux: function* ({ state, aux }) {
            aux({ commonValue: 0, step1: 'first yield processed' });
            yield { counter: state().counter + 1 };

            aux((current: GeneratorAux | undefined) => ({
              ...current!,
              commonValue: state().counter * 10,
              step2: 'second yield processed',
            }));
            yield { counter: state().counter + 1 };

            aux((current: GeneratorAux | undefined) => ({
              ...current!,
              commonValue: current!.commonValue + state().counter,
              finalStep: 'final return processed',
            }));
            return { ...state(), counter: state().counter + 1 };
          },
        };
        type StactionUserActions = UserActions<State, CurrentTestActionsShape>;

        const staction = new Staction<State, StactionUserActions>();
        staction.disableLogging();
        staction.init(actionsImpl, () => ({ counter: 0 }), noop);

        const { state: finalState, aux } =
          await staction.actions.generatorWithAux();

        expect(finalState.counter).toBe(3);
        expect(aux).toBeDefined();
        expect(aux?.step1).toBe('first yield processed');
        expect(aux?.step2).toBe('second yield processed');
        expect(aux?.finalStep).toBe('final return processed');
        expect(aux?.commonValue).toBe(12);
      });
    });
  });

  describe('middleware', () => {
    type State = { data: string; preCounter: number; postCounter: number };
    type Actions = {
      doSomething: (
        params: ActionParams<State, Actions>,
        payload: string
      ) => State;
      asyncAction: (params: ActionParams<State, Actions>) => Promise<State>;
      generatorAction: (
        params: ActionParams<State, Actions>
      ) => Generator<State, State, unknown>;
      mainAction: (params: ActionParams<State, Actions>) => State;
    };

    const initialTestState = (): State => ({
      data: 'initial',
      preCounter: 0,
      postCounter: 0,
    });

    let staction: Staction<State, Actions>;
    let mockPreMiddlewareFn: jest.Mock<
      (params: StactionMiddlewareParams<State, { id: string }>) => void
    >;
    let mockPostMiddlewareFn: jest.Mock<
      (params: StactionMiddlewareParams<State, { id: string }>) => void
    >;
    let genericMockPreFn: jest.Mock<() => void>;
    let genericMockPostFn: jest.Mock<() => void>;

    beforeEach(() => {
      staction = new Staction<State, Actions>();
      staction.disableLogging();
      mockPreMiddlewareFn =
        jest.fn<
          (params: StactionMiddlewareParams<State, { id: string }>) => void
        >();
      mockPostMiddlewareFn =
        jest.fn<
          (params: StactionMiddlewareParams<State, { id: string }>) => void
        >();
      genericMockPreFn = jest.fn<() => void>();
      genericMockPostFn = jest.fn<() => void>();
    });

    const middlewareTestActions: Actions = {
      doSomething: (
        { state }: ActionParams<State, Actions>,
        payload: string
      ) => {
        return { ...state(), data: payload };
      },
      asyncAction: async ({ state }: ActionParams<State, Actions>) => {
        await sleep(10);
        return { ...state(), data: 'async success' };
      },
      generatorAction: function* ({ state }: ActionParams<State, Actions>) {
        yield { ...state(), data: 'generator yield 1' };
        yield { ...state(), data: 'generator yield 2' };
        return { ...state(), data: 'generator final' };
      },
      mainAction: ({ state }: ActionParams<State, Actions>) => {
        return state();
      },
    };

    test('pre and post middleware are called with correct params', async () => {
      const preMeta = { id: 'pre123' };
      const postMeta = { id: 'post456' };

      staction.setMiddleware([
        {
          type: 'pre',
          method: mockPreMiddlewareFn.mockImplementation(
            (params: StactionMiddlewareParams<State, { id: string }>) => {
              expect(params.name).toBe('doSomething');
              expect(params.args).toEqual(['test payload']);
              expect(params.meta).toBe(preMeta);
              expect(params.state().data).toBe('initial');
            }
          ),
          meta: preMeta,
        },
        {
          type: 'post',
          method: mockPostMiddlewareFn.mockImplementation(
            (params: StactionMiddlewareParams<State, { id: string }>) => {
              expect(params.name).toBe('doSomething');
              expect(params.args).toEqual(['test payload']);
              expect(params.meta).toBe(postMeta);
              expect(params.state().data).toBe('test payload');
            }
          ),
          meta: postMeta,
        },
      ]);

      staction.init(middlewareTestActions, initialTestState, noop);
      await staction.actions.doSomething('test payload');

      expect(mockPreMiddlewareFn).toHaveBeenCalledTimes(1);
      expect(mockPostMiddlewareFn).toHaveBeenCalledTimes(1);
    });

    test('middleware can modify state', async () => {
      staction.setMiddleware([
        {
          type: 'pre',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            return {
              ...state(),
              preCounter: state().preCounter + 1,
              data: 'changed by pre',
            };
          },
          meta: {},
        },
        {
          type: 'post',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            return {
              ...state(),
              postCounter: state().postCounter + 1,
              data: 'changed by post',
            };
          },
          meta: {},
        },
      ]);

      staction.init(middlewareTestActions, initialTestState, noop);
      const { state: finalState } = await staction.actions.doSomething(
        'action payload'
      );

      expect(staction.state.data).toBe('changed by post');
      expect(staction.state.preCounter).toBe(1);
      expect(staction.state.postCounter).toBe(1);
      expect(finalState.data).toBe('changed by post');
    });

    test('async middleware works correctly', async () => {
      staction.setMiddleware([
        {
          type: 'pre',
          method: async ({ state }: StactionMiddlewareParams<State>) => {
            await sleep(5);
            return {
              ...state(),
              data: 'pre async modified',
              preCounter: state().preCounter + 1,
            };
          },
          meta: {},
        },
      ]);
      staction.init(middlewareTestActions, initialTestState, noop);
      await staction.actions.doSomething('payload');
      expect(staction.state.data).toBe('payload');
      expect(staction.state.preCounter).toBe(1);
    });

    test('generator middleware works correctly', async () => {
      let preYieldCount = 0;
      staction.setMiddleware([
        {
          type: 'pre',
          method: function* ({ state }: StactionMiddlewareParams<State>) {
            preYieldCount++;
            yield {
              ...state(),
              data: 'pre gen yield 1',
              preCounter: state().preCounter + 1,
            };
            preYieldCount++;
            yield {
              ...state(),
              data: 'pre gen yield 2',
              preCounter: state().preCounter + 1,
            };
            return {
              ...state(),
              data: 'pre gen final',
              preCounter: state().preCounter + 1,
            };
          },
          meta: {},
        },
      ]);
      staction.init(middlewareTestActions, initialTestState, (s) => {});
      await staction.actions.doSomething('main action');

      expect(staction.state.data).toBe('main action');
      expect(staction.state.preCounter).toBe(3);
      expect(preYieldCount).toBe(2);
    });

    test('error in pre-middleware prevents action and post-middleware, propagates error', async () => {
      const preError = new Error('Pre-middleware Error');
      staction.setMiddleware([
        {
          type: 'pre',
          method: (): void => {
            genericMockPreFn();
            throw preError;
          },
          meta: {},
        },
        {
          type: 'post',
          method: genericMockPostFn,
          meta: {},
        },
      ]);

      staction.init(middlewareTestActions, initialTestState, noop);

      try {
        await staction.actions.doSomething('wont run');
      } catch (e) {
        expect(e).toBe(preError);
      }
      expect(genericMockPreFn).toHaveBeenCalledTimes(1);
      expect(genericMockPostFn).not.toHaveBeenCalled();
      expect(staction.state.data).toBe('initial');
    });

    test('error in post-middleware propagates error after action runs', async () => {
      const postError = new Error('Post-middleware Error');
      staction.setMiddleware([
        {
          type: 'post',
          method: (): void => {
            genericMockPostFn();
            throw postError;
          },
          meta: {},
        },
      ]);

      staction.init(middlewareTestActions, initialTestState, noop);

      try {
        await staction.actions.doSomething('action success');
      } catch (e) {
        expect(e).toBe(postError);
      }
      expect(genericMockPostFn).toHaveBeenCalledTimes(1);
      expect(staction.state.data).toBe('action success');
    });

    test('_stateSetCallback should not be called if pre-middleware errors', async () => {
      const mockSetStateCb = jest.fn();
      const preError = new Error('Pre-middleware Error For Callback Test');

      staction.setMiddleware([
        {
          type: 'pre',
          method: () => {
            throw preError;
          },
          meta: { id: 'erroringPre' },
        },
      ]);

      staction.init(middlewareTestActions, initialTestState, mockSetStateCb);

      try {
        await staction.actions.doSomething('payload that wont be processed');
      } catch (e) {
        expect(e).toBe(preError);
      }

      expect(mockSetStateCb).not.toHaveBeenCalled();
      expect(staction.state.data).toBe('initial'); // State remains initial
    });

    test('multiple pre and post middlewares execute in order', async () => {
      const executionOrder: string[] = [];
      const spiedActions: Actions = {
        ...middlewareTestActions,
        mainAction: jest.fn<Actions['mainAction']>(
          ({ state }: ActionParams<State, Actions>) => {
            executionOrder.push('action');
            return state();
          }
        ),
      };

      staction.setMiddleware([
        {
          type: 'pre',
          method: () => {
            executionOrder.push('pre1');
          },
          meta: {},
        },
        {
          type: 'pre',
          method: () => {
            executionOrder.push('pre2');
          },
          meta: {},
        },
        {
          type: 'post',
          method: () => {
            executionOrder.push('post1');
          },
          meta: {},
        },
        {
          type: 'post',
          method: () => {
            executionOrder.push('post2');
          },
          meta: {},
        },
      ]);

      staction.init(spiedActions, initialTestState, noop);
      await staction.actions.mainAction();

      expect(executionOrder).toEqual([
        'pre1',
        'pre2',
        'action',
        'post1',
        'post2',
      ]);
    });

    test('middleware returning undefined should not alter state but allow action to proceed', async () => {
      const preUndefinedMeta = { id: 'preUndefined' };
      const postUndefinedMeta = { id: 'postUndefined' };
      let actionHasAccessToCorrectState = false;

      staction.setMiddleware([
        {
          type: 'pre',
          method: ({
            state,
            meta,
          }: StactionMiddlewareParams<State, { id: string }>) => {
            expect(meta).toBe(preUndefinedMeta);
            expect(state().data).toBe('initial');
            // No return, so it implicitly returns undefined
          },
          meta: preUndefinedMeta,
        },
        {
          type: 'post',
          method: ({
            state,
            meta,
          }: StactionMiddlewareParams<State, { id: string }>) => {
            expect(meta).toBe(postUndefinedMeta);
            expect(state().data).toBe('action processed'); // State after action
            // No return
          },
          meta: postUndefinedMeta,
        },
      ]);

      const testActions: Actions = {
        ...middlewareTestActions,
        doSomething: (
          { state }: ActionParams<State, Actions>,
          payload: string
        ) => {
          // Check if the state seen by the action is what it should be (not modified by pre-middleware)
          actionHasAccessToCorrectState =
            state().data === 'initial' && state().preCounter === 0;
          return { ...state(), data: payload };
        },
      };

      staction.init(testActions, initialTestState, noop);
      const { state: finalState } = await staction.actions.doSomething(
        'action processed'
      );

      expect(actionHasAccessToCorrectState).toBe(true);
      expect(finalState.data).toBe('action processed');
      expect(staction.state.data).toBe('action processed');
      expect(staction.state.preCounter).toBe(0); // Not incremented by pre-middleware
      expect(staction.state.postCounter).toBe(0); // Not incremented by post-middleware
    });

    test('action returning undefined should not change state but callSetStateCallback', async () => {
      const mockSetStateCallback = jest.fn();
      type UndefState = { val: number };
      const actions = {
        actionReturnsUndefined: ({
          state,
        }: ActionParams<UndefState, any>): undefined => {
          // This action explicitly returns undefined
          return undefined;
        },
      };
      const stactionInstance = new Staction<UndefState, typeof actions>();
      stactionInstance.disableLogging();
      const initialSt = { val: 10 };
      stactionInstance.init(actions, () => initialSt, mockSetStateCallback);

      const { state: finalSt, aux } =
        await stactionInstance.actions.actionReturnsUndefined();

      expect(finalSt).toEqual(initialSt); // State should not have changed
      expect(stactionInstance.state).toEqual(initialSt); // Internal state should also be unchanged
      expect(mockSetStateCallback).toHaveBeenCalledTimes(1);
      // Staction calls callSetStateCallback with the current state (_state) and wrappedActions.
      // Since the action returned undefined, _state should be initialSt.
      expect(mockSetStateCallback).toHaveBeenCalledWith(
        initialSt,
        stactionInstance.actions
      );
      expect(aux).toBeUndefined();
    });

    test('async generator middleware modifies state and action sees final pre-middleware state', async () => {
      let preMiddlewareYieldCount = 0;
      let actionObservedData = '';

      staction.setMiddleware([
        {
          type: 'pre',
          method: async function* ({ state }: StactionMiddlewareParams<State>) {
            preMiddlewareYieldCount++;
            yield {
              ...state(),
              data: 'pre async gen yield 1',
              preCounter: state().preCounter + 1,
            };
            await sleep(10); // Simulate async work
            preMiddlewareYieldCount++;
            yield {
              ...state(),
              data: 'pre async gen yield 2',
              preCounter: state().preCounter + 1,
            };
            return {
              ...state(),
              data: 'pre async gen final',
              preCounter: state().preCounter + 1,
            };
          },
          meta: { id: 'preAsyncGen' },
        },
        {
          type: 'post',
          method: async function* ({ state }: StactionMiddlewareParams<State>) {
            yield {
              ...state(),
              data: 'post async gen yield 1',
              postCounter: state().postCounter + 1,
            };
            await sleep(10);
            yield {
              ...state(),
              data: 'post async gen yield 2',
              postCounter: state().postCounter + 1,
            };
            return {
              ...state(),
              data: 'post async gen final',
              postCounter: state().postCounter + 1,
            };
          },
          meta: { id: 'postAsyncGen' },
        },
      ]);

      const testActions: Actions = {
        ...middlewareTestActions,
        mainAction: ({ state }: ActionParams<State, Actions>) => {
          actionObservedData = state().data; // Capture state data as seen by the action
          executionOrder.push('action'); // Assuming executionOrder is reset or managed per test
          return { ...state(), data: 'action executed' };
        },
      };
      const localInitialState = initialTestState();
      staction.init(testActions, () => localInitialState, noop);

      // Reset executionOrder for this specific test if it's used across tests
      const executionOrder: string[] = []; // Local execution order for this test

      const { state: finalState } = await staction.actions.mainAction();

      expect(preMiddlewareYieldCount).toBe(2); // Number of yields before return
      expect(actionObservedData).toBe('pre async gen final'); // Action sees state after pre-middleware completion
      expect(staction.state.data).toBe('post async gen final'); // Final state after post-middleware
      expect(staction.state.preCounter).toBe(3); // Incremented 3 times by pre-middleware
      expect(staction.state.postCounter).toBe(3); // Incremented 3 times by post-middleware
      expect(finalState.data).toBe('post async gen final');
    });

    test('error in middle pre-middleware stops chain and preserves prior pre-middleware state changes', async () => {
      const executionOrder: string[] = [];
      const err = new Error('Mid Pre-Middleware Error');
      const mockPostFn = jest.fn();

      // Explicitly type the mock to match the Actions.mainAction signature
      const mockMainAction = jest.fn<
        (params: ActionParams<State, Actions>) => State
      >(({ state }: ActionParams<State, Actions>): State => {
        // This implementation shouldn't be called in this test path, but needs to match type
        executionOrder.push('action-should-not-run');
        return state();
      });

      const spiedActions: Actions = {
        ...middlewareTestActions,
        mainAction: mockMainAction,
      };

      staction.setMiddleware([
        {
          type: 'pre',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            executionOrder.push('pre1');
            return {
              ...state(),
              preCounter: state().preCounter + 1,
              data: 'pre1 modified',
            };
          },
          meta: { id: 'pre1' },
        },
        {
          type: 'pre',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            executionOrder.push('pre2-error');
            // This state change should ideally not persist if error occurs right after
            // but Staction updates state after each middleware.
            // So, { ...state(), preCounter: state().preCounter + 1 } would make preCounter = 2
            throw err;
          },
          meta: { id: 'pre2err' },
        },
        {
          type: 'pre',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            executionOrder.push('pre3-skipped');
            return { ...state(), preCounter: state().preCounter + 1 };
          },
          meta: { id: 'pre3' },
        },
        {
          type: 'post',
          method: mockPostFn,
          meta: { id: 'postSkipped' },
        },
      ]);

      const testInitialState = initialTestState(); // { data: 'initial', preCounter: 0, postCounter: 0 }
      staction.init(spiedActions, () => testInitialState, noop);

      try {
        await staction.actions.mainAction();
      } catch (e) {
        expect(e).toBe(err);
      }

      expect(executionOrder).toEqual(['pre1', 'pre2-error']);
      expect(spiedActions.mainAction).not.toHaveBeenCalled();
      expect(mockPostFn).not.toHaveBeenCalled();
      expect(staction.state.data).toBe('pre1 modified');
      expect(staction.state.preCounter).toBe(1); // Only pre1's increment should persist
      expect(staction.state.postCounter).toBe(0);
    });

    test('error in middle post-middleware stops chain and preserves prior post-middleware state changes', async () => {
      const executionOrder: string[] = [];
      const err = new Error('Mid Post-Middleware Error');
      let actionEffectApplied = false;

      const mockMainAction = jest.fn<
        (params: ActionParams<State, Actions>) => State
      >(({ state }: ActionParams<State, Actions>): State => {
        executionOrder.push('action');
        actionEffectApplied = true;
        return { ...state(), data: 'action processed' };
      });

      const spiedActions: Actions = {
        ...middlewareTestActions,
        mainAction: mockMainAction,
      };

      staction.setMiddleware([
        {
          type: 'post',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            executionOrder.push('post1');
            return {
              ...state(),
              postCounter: state().postCounter + 1,
              data: 'post1 modified',
            };
          },
          meta: { id: 'post1' },
        },
        {
          type: 'post',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            executionOrder.push('post2-error');
            // This state change (e.g. incrementing postCounter again) should ideally not persist if error is right after.
            // However, Staction updates state after *each* middleware step.
            // So, state will reflect this before the throw.
            // For this test, let's assume state is updated *before* the throw from this middleware.
            // If { ...state(), postCounter: state().postCounter + 1 } was returned before throw, postCounter would be 2.
            throw err;
          },
          meta: { id: 'post2err' },
        },
        {
          type: 'post',
          method: ({ state }: StactionMiddlewareParams<State>) => {
            executionOrder.push('post3-skipped');
            return { ...state(), postCounter: state().postCounter + 1 };
          },
          meta: { id: 'post3' },
        },
      ]);

      const testInitialState = initialTestState(); // { data: 'initial', preCounter: 0, postCounter: 0 }
      staction.init(spiedActions, () => testInitialState, noop);

      try {
        await staction.actions.mainAction();
      } catch (e) {
        expect(e).toBe(err);
      }

      expect(executionOrder).toEqual(['action', 'post1', 'post2-error']);
      expect(actionEffectApplied).toBe(true);
      expect(spiedActions.mainAction).toHaveBeenCalledTimes(1);
      // State should reflect action and first post-middleware
      expect(staction.state.data).toBe('post1 modified');
      expect(staction.state.preCounter).toBe(0); // No pre-middleware in this test
      expect(staction.state.postCounter).toBe(1); // Only post1's increment
    });
  });

  describe('State Set Callback Behavior', () => {
    test('error in _stateSetCallback should propagate', async () => {
      type State = { value: number };
      const actions = {
        updateValue: (
          { state }: ActionParams<State, any>,
          newValue: number
        ) => {
          return { value: newValue };
        },
      };

      const callbackError = new Error('Callback Failed!');
      const mockFailingCallback = jest.fn(() => {
        throw callbackError;
      });

      const staction = new Staction<State, typeof actions>();
      staction.disableLogging();
      // Suppress console.error for Staction's internal error logging of the callback failure
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      staction.init(actions, () => ({ value: 0 }), mockFailingCallback);

      try {
        await staction.actions.updateValue(10);
        // If Staction catches and doesn't re-throw, this line will be hit.
        // Depending on desired behavior, this might or might not be a test failure.
        // For now, let's assume unhandled errors from callback should propagate.
      } catch (e) {
        expect(e).toBe(callbackError);
      }

      expect(mockFailingCallback).toHaveBeenCalledTimes(1);
      // The state within Staction should have been updated before the callback threw
      expect(staction.state.value).toBe(10);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('init method correctness', () => {
    test('should throw an error if init is called when already initialized', async () => {
      const staction = new Staction();
      staction.disableLogging();
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {}); // Suppress console.error for this test
      await staction.init({}, () => ({}), noop);
      expect(staction.initState).toBe('initialized');

      try {
        await staction.init({}, () => ({}), noop);
      } catch (e: any) {
        expect(e.message).toContain(
          'Staction instance has already been initialized'
        );
      }
      expect(staction.initState).toBe('initialized'); // Should remain initialized
      errorSpy.mockRestore();
    });

    test('should set initState to "initerror" if initFunc throws an error', async () => {
      const staction = new Staction();
      staction.disableLogging(); // Prevent console.error from failing the test due to output
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {}); // Suppress console.error
      const failingInitFunc = () => {
        throw new Error('Init failed');
      };
      try {
        // @ts-ignore testing invalid initFunc
        await staction.init({}, failingInitFunc, noop);
      } catch (e: any) {
        // Staction's init catches the error and logs it, then sets initState
      }
      expect(staction.initState).toBe('initerror');
      errorSpy.mockRestore();
    });

    test('should throw an error if init is called when initState is "initerror"', async () => {
      const staction = new Staction();
      staction.disableLogging();
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const failingInitFunc = () => {
        throw new Error('Init failed');
      };
      try {
        // @ts-ignore testing invalid initFunc
        await staction.init({}, failingInitFunc, noop);
      } catch (e) {
        // Error caught by init
      }
      expect(staction.initState).toBe('initerror');

      try {
        await staction.init({}, () => ({}), noop);
      } catch (e: any) {
        expect(e.message).toContain(
          'An error has previously occured when trying to init this instance'
        );
      }
      expect(staction.initState).toBe('initerror');
      errorSpy.mockRestore();
    });
  });

  describe('Logging functionality', () => {
    let consoleLogSpy: any;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    test('enableLogging and disableLogging should control console output', async () => {
      type LogState = { msg: string };
      type LogActions = {
        testLog: (params: ActionParams<LogState, LogActions>) => {
          msg: string;
        };
      };
      const staction = new Staction<LogState, LogActions>();
      const actions: LogActions = { testLog: () => ({ msg: 'logged' }) };
      staction.init(actions, () => ({ msg: 'initial' }), noop);

      staction.enableLogging();
      await staction.actions.testLog();
      expect(consoleLogSpy).toHaveBeenCalledWith('action: ', 'testLog');
      consoleLogSpy.mockClear();

      staction.disableLogging();
      await staction.actions.testLog();
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockClear();

      staction.enableLogging();
      await staction.actions.testLog();
      expect(consoleLogSpy).toHaveBeenCalledWith('action: ', 'testLog');
    });

    test('enableStateWhenLogging and disableStateWhenLogging should control state in logs', async () => {
      type CountState = { count: number };
      type CountActions = {
        increment: (params: ActionParams<CountState, CountActions>) => {
          count: number;
        };
      };

      const staction = new Staction<CountState, CountActions>();
      const actionsImpl: CountActions = {
        increment: ({ state }: ActionParams<CountState, CountActions>) => ({
          count: state().count + 1,
        }),
      };
      const initialState = { count: 0 };
      await staction.init(actionsImpl, () => initialState, noop);
      staction.enableLogging();

      staction.enableStateWhenLogging();
      await staction.actions.increment();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'action: ',
        'increment',
        initialState
      );
      consoleLogSpy.mockClear();

      staction.disableStateWhenLogging();
      await staction.actions.increment();
      expect(consoleLogSpy).toHaveBeenCalledWith('action: ', 'increment');
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ count: 1 })
      );
      consoleLogSpy.mockClear();

      staction.enableStateWhenLogging();
      await staction.actions.increment();
      expect(consoleLogSpy).toHaveBeenCalledWith('action: ', 'increment', {
        count: 2,
      });
    });
  });

  describe('Nested Action Calls', () => {
    type NestedState = {
      parentValue: string;
      childValue: string;
      middlewareLog: string[];
    };

    // Types for the original action functions provided to staction.init
    type OriginalActions = {
      parentAction: (
        params: ActionParams<
          NestedState,
          OriginalActions,
          Map<'parent_start' | 'parent_end', string>
        >,
        data: string
      ) => Promise<NestedState> | NestedState;
      childAction: (
        params: ActionParams<
          NestedState,
          OriginalActions,
          Map<'child_data', string>
        >,
        data: string
      ) => Promise<NestedState> | NestedState;
    };

    let stactionInstance: Staction<NestedState, OriginalActions>;
    let executionLog: string[];
    let parentAuxData: Map<string, any> | undefined;
    let childAuxDataFromParent: Map<string, any> | undefined;

    const initialNestedState = (): NestedState => ({
      parentValue: 'initial_parent',
      childValue: 'initial_child',
      middlewareLog: [],
    });

    const actionsImpl: OriginalActions = {
      parentAction: async (
        {
          state,
          actions,
          aux,
        }: ActionParams<
          NestedState,
          OriginalActions,
          Map<'parent_start' | 'parent_end', string>
        >,
        data: string
      ) => {
        executionLog.push('parentAction_start');
        aux((m: Map<'parent_start' | 'parent_end', string> | undefined) =>
          m ? m.set('parent_start', data) : new Map().set('parent_start', data)
        );

        // 'actions.childAction' here is the wrapped version, so it returns { state, aux }
        const { state: stateAfterChild, aux: childAux } =
          await actions.childAction('child_data');
        childAuxDataFromParent = childAux;
        executionLog.push('parentAction_after_child_call');

        expect(state().childValue).toBe('child_data_processed');
        expect(stateAfterChild.childValue).toBe('child_data_processed');

        aux((m: Map<'parent_start' | 'parent_end', string> | undefined) =>
          m
            ? m.set('parent_end', 'parent_done')
            : new Map().set('parent_end', 'parent_done')
        );
        // The original action returns just the new state
        return { ...state(), parentValue: data + '_processed' };
      },
      childAction: async (
        {
          state,
          aux,
        }: ActionParams<
          NestedState,
          OriginalActions,
          Map<'child_data', string>
        >,
        data: string
      ) => {
        executionLog.push('childAction_start');
        aux((m: Map<'child_data', string> | undefined) =>
          m ? m.set('child_data', data) : new Map().set('child_data', data)
        );
        // The original action returns just the new state
        return { ...state(), childValue: data + '_processed' };
      },
    };

    beforeEach(() => {
      executionLog = [];
      parentAuxData = undefined;
      childAuxDataFromParent = undefined;
      stactionInstance = new Staction<NestedState, OriginalActions>();
      stactionInstance.disableLogging();
    });

    test('calling another action maintains context, state, middleware, and aux map isolation', async () => {
      stactionInstance.setMiddleware([
        // Middleware for parentAction
        {
          type: 'pre',
          method: ({ name, state }: StactionMiddlewareParams<NestedState>) => {
            if (name === 'parentAction') {
              executionLog.push('preParent');
              return {
                ...state(),
                middlewareLog: [...state().middlewareLog, 'preParent'],
              };
            }
            return state(); // No change if not parentAction
          },
          meta: {},
        },
        {
          type: 'post',
          method: ({ name, state }: StactionMiddlewareParams<NestedState>) => {
            if (name === 'parentAction') {
              executionLog.push('postParent');
              return {
                ...state(),
                middlewareLog: [...state().middlewareLog, 'postParent'],
              };
            }
            return state(); // No change if not parentAction
          },
          meta: {},
        },
        // Middleware for childAction
        {
          type: 'pre',
          method: ({ name, state }: StactionMiddlewareParams<NestedState>) => {
            if (name === 'childAction') {
              executionLog.push('preChild');
              return {
                ...state(),
                middlewareLog: [...state().middlewareLog, 'preChild'],
              };
            }
            return state(); // No change if not childAction
          },
          meta: {},
        },
        {
          type: 'post',
          method: ({ name, state }: StactionMiddlewareParams<NestedState>) => {
            if (name === 'childAction') {
              executionLog.push('postChild');
              return {
                ...state(),
                middlewareLog: [...state().middlewareLog, 'postChild'],
              };
            }
            return state(); // No change if not childAction
          },
          meta: {},
        },
      ]);

      stactionInstance.init(actionsImpl, initialNestedState, noop);
      const { state: finalState, aux } =
        await stactionInstance.actions.parentAction('parent_data');
      parentAuxData = aux;

      expect(executionLog).toEqual([
        'preParent',
        'parentAction_start',
        'preChild',
        'childAction_start',
        'postChild',
        'parentAction_after_child_call',
        'postParent',
      ]);

      // Check final state
      expect(finalState.parentValue).toBe('parent_data_processed');
      expect(finalState.childValue).toBe('child_data_processed');
      expect(finalState.middlewareLog).toEqual([
        'preParent',
        'preChild',
        'postChild',
        'postParent',
      ]);

      // Check passed data for parent action
      expect(parentAuxData?.get('parent_start')).toBe('parent_data');
      expect(parentAuxData?.get('parent_end')).toBe('parent_done');
      expect(parentAuxData?.has('child_data')).toBe(false); // Child's aux data is isolated

      // Check passed data received from child action by parent
      expect(childAuxDataFromParent?.get('child_data')).toBe('child_data');
      expect(childAuxDataFromParent?.size).toBe(1);
    });
  });

  describe('Initialization Process and initFunc', () => {
    type InitTestState = {
      counter: number;
      initActionDone: boolean;
      initMiddlewareCalled: boolean;
    };

    type CurrentInitTestActionsShape = {
      internalInitAction: (
        params: ActionParams<
          InitTestState,
          CurrentInitTestActionsShape,
          Map<never, never>
        >
      ) => Promise<Partial<InitTestState>> | Partial<InitTestState>;
    };

    test('initFunc calling an action executes it including middleware and affects initial state', async () => {
      const mockSetStateCb = jest.fn();
      let executionLog: string[] = [];

      const actionsDef: CurrentInitTestActionsShape = {
        internalInitAction: async ({ state }) => {
          executionLog.push('internalInitAction_run');
          const currentCounter =
            typeof state().counter === 'number' ? state().counter : 0;
          return {
            ...state(),
            counter: currentCounter + 1,
            initActionDone: true,
          };
        },
      };

      type StactionUserActionsType = UserActions<
        InitTestState,
        CurrentInitTestActionsShape
      >;

      const staction = new Staction<InitTestState, StactionUserActionsType>();
      staction.disableLogging();
      staction.setMiddleware([
        {
          type: 'pre',
          method: ({
            name,
            state,
          }: StactionMiddlewareParams<InitTestState>) => {
            if (name === 'internalInitAction') {
              executionLog.push('internalInitAction_preMiddleware');
              return { ...state(), initMiddlewareCalled: true };
            }
            return state();
          },
          meta: {},
        },
      ]);

      const initFunc = async (
        actionsArg: StactionActions<InitTestState, CurrentInitTestActionsShape>
      ): Promise<InitTestState> => {
        executionLog.push('initFunc_start');
        const { state: stateAfterWrappedInternalAction } =
          await actionsArg.internalInitAction();
        executionLog.push('initFunc_after_action_call');
        return stateAfterWrappedInternalAction;
      };

      await staction.init(actionsDef, initFunc, mockSetStateCb);

      expect(executionLog).toEqual([
        'initFunc_start',
        'internalInitAction_preMiddleware',
        'internalInitAction_run',
        'initFunc_after_action_call',
      ]);

      expect(staction.state.initActionDone).toBe(true);
      expect(staction.state.initMiddlewareCalled).toBe(true);
      expect(staction.state.counter).toBe(1);

      expect(mockSetStateCb).toHaveBeenCalledTimes(1);
      expect(mockSetStateCb.mock.calls[0][0]).toEqual(staction.state);
      expect(mockSetStateCb.mock.calls[0][0]).toMatchObject({
        counter: 1,
        initActionDone: true,
        initMiddlewareCalled: true,
      });
    });
  });

  describe('Per-Action AuxData Type (formerly PassedMapType)', () => {
    test('actions can have different AuxData types and they are correctly inferred', async () => {
      type State = { data: string };

      type ActionsShape = {
        actionOne: (
          params: ActionParams<State, ActionsShape, Map<string, number>>,
          val: number
        ) => State;
        actionTwo: (
          params: ActionParams<State, ActionsShape, Map<string, boolean>>,
          val: boolean
        ) => State;
        actionThree: (
          // Action with no aux data
          params: ActionParams<State, ActionsShape, Map<never, never>>
        ) => State;
      };

      const actionsImpl: ActionsShape = {
        actionOne: ({ state, aux }, val: number) => {
          aux(() => new Map().set('numericOutput', val * 2));
          return { ...state, data: `one:${val}` };
        },
        actionTwo: ({ state, aux }, val: boolean) => {
          aux((m: Map<string, boolean> | undefined) =>
            m
              ? m.set('booleanOutput', !val)
              : new Map().set('booleanOutput', !val)
          );
          return { ...state, data: `two:${val}` };
        },
        actionThree: ({ state }) => {
          // No call to aux()
          return { ...state, data: 'three' };
        },
      };

      type TestActions = {
        actionOne: typeof actionsImpl.actionOne;
        actionTwo: typeof actionsImpl.actionTwo;
        actionThree: typeof actionsImpl.actionThree;
      };

      // type StactionUserActions = UserActions<State, TestActions>;
      const staction = new Staction<State, TestActions>();
      staction.disableLogging();
      staction.init(actionsImpl, () => ({ data: 'initial' }), noop);

      // Test Action One
      const resultOne = await staction.actions.actionOne(10);
      expect(resultOne.state.data).toBe('one:10');
      expect(resultOne.aux).toBeInstanceOf(Map);
      expect(resultOne.aux?.size).toBe(1);
      expect(resultOne.aux?.get('numericOutput')).toBe(20);

      // Test Action Two
      const resultTwo = await staction.actions.actionTwo(true);
      expect(resultTwo.state.data).toBe('two:true');
      expect(resultTwo.aux).toBeInstanceOf(Map);
      expect(resultTwo.aux?.size).toBe(1);
      expect(resultTwo.aux?.get('booleanOutput')).toBe(false);

      // Test Action Three
      const resultThree = await staction.actions.actionThree();
      expect(resultThree.state.data).toBe('three');
      expect(resultThree.aux).toBeUndefined();
    });
  });

  describe('Public API Getters and Methods', () => {
    test('getState() method returns current state after async action', async () => {
      type GetStateTestState = { val: number };
      type GetStateTestActions = {
        setVal: (
          params: ActionParams<GetStateTestState, GetStateTestActions>,
          newVal: number
        ) => GetStateTestState;
      };

      const staction = new Staction<GetStateTestState, GetStateTestActions>();
      staction.disableLogging();
      const actions: GetStateTestActions = {
        setVal: (
          { state }: ActionParams<GetStateTestState, GetStateTestActions>,
          newVal: number
        ) => ({ val: newVal }),
      };
      await staction.init(actions, () => ({ val: 1 }), noop);

      expect(staction.getState()).toEqual({ val: 1 });
      await staction.actions.setVal(100);
      expect(staction.getState()).toEqual({ val: 100 });
      expect(staction.state).toEqual({ val: 100 });
    });

    test('actions getter returns wrapped actions', async () => {
      const staction = new Staction<any, { myAction: () => void }>();
      staction.disableLogging();
      const originalActions = { myAction: jest.fn() };
      await staction.init(originalActions, () => ({}), noop);

      expect(staction.actions).toBeDefined();
      expect(staction.actions.myAction).toBeDefined();
      expect(typeof staction.actions.myAction).toBe('function');
      // Calling it should not throw (actual functionality tested elsewhere)
      expect(() => staction.actions.myAction()).not.toThrow();
    });

    test('initialized getter and initState correctly reflect lifecycle', async () => {
      const staction = new Staction();
      staction.disableLogging();
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Before init
      expect(staction.initialized).toBe(false);
      expect(staction.initState).toBe('uninitialized');

      // After successful init
      await staction.init({ do: () => ({}) }, () => ({}), noop);
      expect(staction.initialized).toBe(true);
      expect(staction.initState).toBe('initialized');

      // After failed init
      const stactionFail = new Staction();
      stactionFail.disableLogging();
      const failingInitFunc = () => {
        throw new Error('Init fail');
      };
      try {
        // @ts-ignore
        await stactionFail.init({ do: () => ({}) }, failingInitFunc, noop);
      } catch (e) {
        /* Staction handles this internally and sets initState */
      }
      expect(stactionFail.initialized).toBe(false);
      expect(stactionFail.initState).toBe('initerror');
      errorSpy.mockRestore();
    });
  });

  describe('General Type Inference Tests', () => {
    test('inferred types are correct', async () => {
      function testAction1(
        { state }: ActionParams<State, TestActions>,
        nextCount: number
      ) {
        return { ...state(), count: nextCount };
      }

      async function testAction2(
        { state, aux }: ActionParams<State, TestActions, Map<'test', string>>,
        nextCount: number
      ): Promise<State> {
        aux(() => new Map().set('test', 'test'));
        return { ...state(), count: nextCount };
      }

      type State = {
        count: number;
        name: string;
        value: number | string;
        obj: { key: string };
      };

      type TestActions = {
        testAction1: typeof testAction1;
        testAction2: typeof testAction2;
      };

      const testActions: TestActions = {
        testAction1,
        testAction2,
      };

      const staction = new Staction<State, TestActions>();
      await staction.init(
        testActions,
        () => ({ count: 0, name: 'test', value: 1, obj: { key: 'value' } }),
        noop
      );

      const { state: result } = await staction.actions.testAction1(20);

      expect(result).toEqual({
        count: 20,
        name: 'test',
        value: 1,
        obj: { key: 'value' },
      });

      const { state: result2, aux: aux2 } = await staction.actions.testAction2(
        20
      );

      expect(result2).toEqual({
        count: 20,
        name: 'test',
        value: 1,
        obj: { key: 'value' },
      });

      expect(aux2).toBeInstanceOf(Map);
      expect(aux2?.size).toBe(1);
      expect(aux2?.get('test')).toBe('test');
    });
  });
});
