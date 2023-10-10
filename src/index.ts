import React from 'react'
import shallowEqual from './shallowEqual'

type StateListener<T> = (state: T) => void
type StateSelector<T, U> = (state: T) => U
type PartialState<T> = Partial<T> | ((state: T) => Partial<T>)

export default function create<
  State extends Record<string, any>,
  SetState extends (PartialState: PartialState<Record<string, any>>) => void,
  GetState extends () => Record<string, any>
>(createState: (set: SetState, get: GetState) => State) {
  const listeners: Set<StateListener<State>> = new Set()

  const setState = (partialState: PartialState<State>) => {
    state = Object.assign(
      {},
      state,
      typeof partialState === 'function' ? partialState(state) : partialState
    )
    listeners.forEach(listener => listener(state))
  }

  const getState = () => state

  const subscribe = (listener: StateListener<State>) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const destroy = () => {
    listeners.clear()
    state = {} as State
  }

  function useStore(): State
  function useStore<U>(
    selector: StateSelector<State, U>,
    deps?: readonly any[]
  ): U
  function useStore<U>(
    selector?: StateSelector<State, U>,
    deps?: readonly any[]
  ) {
    // Gets entire state if no selector was passed in
    const selectState = React.useCallback(
      typeof selector === 'function' ? selector : getState,
      deps
    )
    // Nothing stored in useState, just using to enable forcing an update
    const [, forceUpdate] = React.useState({})
    // Always get latest slice unless dependencies are passed in
    const stateSlice = React.useMemo(() => selectState(state), deps)
    // Prevent subscribing/unsubscribing to the store when values change by storing them in a ref object
    const refs = React.useRef({ stateSlice, selectState }).current

    React.useEffect(() => {
      refs.stateSlice = stateSlice
      refs.selectState = selectState
    }, [stateSlice, selectState])

    React.useEffect(() => {
      return subscribe(() => {
        // Update component if latest state slice doesn't match
        if (!shallowEqual(refs.stateSlice, refs.selectState(state))) {
          forceUpdate({})
        }
      })
    }, [])

    // Returning the selected state slice
    return stateSlice
  }

  let state = createState(setState as SetState, getState as GetState)
  const api = { destroy, getState, setState, subscribe }
  const result: [typeof useStore, typeof api] = [useStore, api]

  return result
}
