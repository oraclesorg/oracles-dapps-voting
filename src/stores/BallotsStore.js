import { observable } from 'mobx'

class BallotsStore {
  @observable ballotCards

  constructor() {
    this.ballotCards = []
  }

  reset() {
    this.ballotCards = []
  }
}

const ballotsStore = new BallotsStore()

export default ballotsStore
export { BallotsStore }
