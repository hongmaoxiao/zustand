import React from 'react'

export default function create(fn) {
  let listeners = []
  // console.log('fn--------------------------------: ', fn)
  let state = {
    current: fn(
      merge => {
        // console.log('merge--------before:', merge)
        if (typeof merge === 'function') {
          merge = merge(state.current)
        }
        // console.log('merge--------after:', merge)
        state.current = { ...state.current, ...merge }
        // console.log('state.current:', state.current)
        // console.log('listeners:', listeners)
        listeners.forEach(listener => listener(state.current))
      },
      () => state.current
    ),
  }
  // console.log('state:', state)
  // console.log('listeners 111:', listeners)
  return [
    // useStore
    (selector, dependencies) => {
      // console.log('selector 1111: ', selector)
      let selected = selector ? selector(state.current) : { ...state.current }
      // console.log('selected 1111: ', selected)
      // Using functional initial b/c selected itself could be a function
      const [slice, set] = React.useState(() => selected)
      const sliceRef = React.useRef()
      React.useEffect(() => void (sliceRef.current = slice), [slice])
      React.useEffect(() => {
        const ping = () => {
          // Get fresh selected state
          // console.log('selector 2222: ', selector)
          let selected = selector ? selector(state.current) : state.current
          // console.log('typeof selected: ', typeof selected)
          // console.log('sliceRef.current: ', sliceRef.current)
          // console.log('selected 2222: ', selected)
          // console.log('sliceRef.current !== selected: ', sliceRef.current !== selected)
          // If state is not a atomic shallow equal it
          if (sliceRef.current !== selected && typeof selected === 'object' && !Array.isArray(selected)) {
            // console.log('in update here 111----: ', selected)
            selected = Object.entries(selected).reduce(
              (acc, [key, value]) => (sliceRef.current[key] !== value ? { ...acc, [key]: value } : acc),
              sliceRef.current
            )
          }
          // Using functional initial b/c selected itself could be a function
          if (sliceRef.current !== selected) {
            // console.log('in update here 222----: ', selected)
            // Refresh local slice
            set(() => selected)
          }
        }
        // console.log('listeners 222:', listeners)
        listeners.push(ping)
        return () => (listeners = listeners.filter(i => i !== ping))
      }, dependencies || [selector])
      // Returning the selected state slice
      return selected
    },
    {
      subscribe: fn => {
        listeners.push(fn)
        return () => (listeners = listeners.filter(i => i !== fn))
      },
      getState: () => state.current,
      destroy: () => {
        listeners = []
        state.current = {}
      },
    },
  ]
}
