class State {
  changed = false
  value = ''
}

const state = new State()

export class Machine {
  constructor(config, option) {
    this.config = config
    this.option = option
    this.context = Object.assign({}, config.context)
  }

  transition(current, evt) {
    state.changed = false
    state.value = current

    const ctx = this.context
    const { states, on } = this.config
    const { actions, guards } = this.option

    const node = states[current]
    const transition = node?.on?.[evt] || on?.[evt]
    if (!transition) {
      return state
    }

    if (typeof transition === 'string') {
      state.changed = true
      state.value = transition
    } else if (Array.isArray(transition)) {
      for (var i = 0, len = transition.length; i < len; i++) {
        var v = transition[i]
        if (typeof v === 'string') {
          state.changed = true
          state.value = v
        } else if (v.cond && guards[v.cond](ctx, evt)) {
          state.changed = true
          state.value = v.target
          break
        } else if (v.target && !v.cond) {
          state.changed = true
          state.value = v.target
          break
        }
      }
    } else {
      // undefined  type
      return state
    }

    if (!state.changed) return state

    const newNode = states[state.value]

    const { exit } = node
    if (typeof exit === 'string') {
      actions[exit](ctx)
    } else if (Array.isArray(exit)) {
      for (var i = 0, len = exit.length; i < len; i++) {
        actions[exit[i]](ctx)
      }
    }

    const { entry } = newNode
    if (typeof entry === 'string') {
      actions[entry](ctx)
    } else if (Array.isArray(entry)) {
      for (var i = 0, len = entry.length; i < len; i++) {
        actions[entry[i]](ctx)
      }
    }

    return state
  }
}

class Service {
  constructor(machine) {
    this.machine = machine
    this.state = machine.config.initial
  }

  start() {}

  send(evt) {
    const { machine } = this
    const s = machine.transition(this.state, evt)
    this.state = s.value
    return s
  }
}

export const interpret = (m) => new Service(m)

export const assign = (obj) => {
  const keys = Object.keys(obj)
  return (ctx) => {
    for (var i = 0, len = keys.length; i < len; i++) {
      var key = keys[i]
      const val = obj[key]
      ctx[key] = typeof val === 'function' ? val(ctx) : val
    }
  }
}
