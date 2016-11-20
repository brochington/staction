# Staction
A straightforward method of managing state, with support for Promises, Generators, and Async/Await.

Because sometimes all you really need is state and actions.

[![Build Status](https://travis-ci.org/brochington/staction.svg?branch=master)](https://travis-ci.org/brochington/staction)

Basic usage:

```
import Staction from 'staction'

let staction = new Staction()

let actions = {
  increment: (state, actions, incrementAmount = 1) => {
    return {
      count: state().count + incrementAmount
    };
  }
}

let initialState = (actions) => {
  return {count: 0};
}

/*
   This method is called every time after state is updated.
   Useful for calling setState at the top of a React component tree.
*/

let onStateUpdate = (state, actions) => console.log(`count is ${state}`)

staction.init(
  actions,
  initialState,
  onStateUpdate
)

let incrementAmount = 5

/*
   all actions return a promise, that resolves with the updated state.
   This helps eliminate passing callbacks through, and also allows for a way
   to react to errors that occur in actions from outside the action.
*/
let result = staction.actions.increment(incrementAmount)

result
  .then(newState => console.log(newState))
  .catch(e => console.log(e))


console.log(staction.state) // state is {count: 5}
```

## Actions

Actions should always yield/return the full new state, or a Promise that resolves to the new state. They can be regular, async, or generator functions, and async call order will be maintained! The state argument is a function that will always return the current state. Additional arguments passed when the action is invoked are passed after state and actions.


All of the following are valid actions.

```
const myActions = {
  action1: (state, actions) => state() + 1,

  actions2: (state) => {
    return Promise.resolve(state() + 1);
  },

  action3: function* (state, actions) {
    yield state() + 1;
    // state() === 1

    yield state() + 1;
    // state() === 2
  },

  action4: function* (state, actions) {
    yield state() + 1
    // state() === 1

    yield new Promise(resolve => resolve(state() + 1))
    // state() === 2

    // IIFE's come in really handy if you want to combine Generators and async functions.
    yield (async function(){
      return state() + 1
      // state() === 3
    }())
  }
}
```

## With React

A "state down, actions up" style of configuration in a React component might look something like:

```
import React from 'react'
import Staction from 'staction'
import ChildComponent from './ChildComponent'

const initState = {}

const appActions = {
  noopAction: (state) => {return state}
}


export default class MyComponent extends React.Component {
  componentWillMount() {
    this.staction = new Staction();

    this.staction.init(appActions, () => initState, this.setState)
  }

  render() {
    return (
      <ChildComponent actions={this.staction.actions} appState={this.state}/>
    )
  }
}
```
