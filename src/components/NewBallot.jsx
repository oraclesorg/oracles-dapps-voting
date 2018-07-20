import React from 'react'
import { inject, observer } from 'mobx-react'
import moment from 'moment'
import swal from 'sweetalert2'
import { Validator } from './Validator.jsx'
import { KeysTypes } from './KeysTypes.jsx'
import { BallotKeysMetadata } from './BallotKeysMetadata.jsx'
import { BallotMinThresholdMetadata } from './BallotMinThresholdMetadata.jsx'
import { BallotProxyMetadata } from './BallotProxyMetadata.jsx'
import { messages } from '../messages'
import { constants } from '../constants'
import { sendTransactionByVotingKey } from '../helpers'
@inject('commonStore', 'ballotStore', 'validatorStore', 'contractsStore', 'routing', 'ballotsStore')
@observer
export class NewBallot extends React.Component {
  constructor(props) {
    super(props)
    this.onClick = this.onClick.bind(this)
  }

  getStartTimeUnix() {
    return moment
      .utc()
      .add(constants.startTimeOffsetInMinutes, 'minutes')
      .unix()
  }

  checkValidation() {
    const { commonStore, contractsStore, ballotStore, validatorStore } = this.props

    if (ballotStore.isNewValidatorPersonalData) {
      for (let validatorProp in validatorStore) {
        if (validatorStore[validatorProp].length === 0) {
          swal('Warning!', `Validator ${validatorProp} is empty`, 'warning')
          commonStore.hideLoading()
          return false
        }
      }
    }

    if (!ballotStore.memo) {
      swal('Warning!', messages.DESCRIPTION_IS_EMPTY, 'warning')
      commonStore.hideLoading()
      return false
    }

    const minBallotDurationInHours = constants.minBallotDurationInDays * 24
    const startTime = this.getStartTimeUnix()
    const minEndTime = moment
      .utc()
      .add(minBallotDurationInHours, 'hours')
      .format()
    let neededMinutes = moment(minEndTime).diff(moment(ballotStore.endTime), 'minutes')
    let neededHours = Math.floor(neededMinutes / 60)
    let duration = moment.unix(ballotStore.endTimeUnix).diff(moment.unix(startTime), 'hours')

    if (duration < 0) {
      duration = 0
    }

    if (neededMinutes > 0) {
      neededMinutes = Math.abs(neededHours * 60 - neededMinutes)
      swal(
        'Warning!',
        messages.SHOULD_BE_MORE_THAN_MIN_DURATION(minBallotDurationInHours, duration, neededHours, neededMinutes),
        'warning'
      )
      commonStore.hideLoading()
      return false
    }

    const twoWeeks = moment
      .utc()
      .add(14, 'days')
      .format()
    let exceededMinutes = moment(ballotStore.endTime).diff(moment(twoWeeks), 'minutes')
    if (exceededMinutes > 0) {
      swal('Warning!', messages.SHOULD_BE_LESS_OR_EQUAL_14_DAYS(duration), 'warning')
      commonStore.hideLoading()
      return false
    }

    if (ballotStore.isBallotForKey) {
      for (let ballotKeysProp in ballotStore.ballotKeys) {
        if (ballotKeysProp === 'newVotingKey' || ballotKeysProp === 'newPayoutKey') {
          continue
        }
        if (!ballotStore.ballotKeys[ballotKeysProp]) {
          swal('Warning!', `Ballot ${ballotKeysProp} is empty`, 'warning')
          commonStore.hideLoading()
          return false
        }
        if (ballotStore.ballotKeys[ballotKeysProp].length === 0) {
          swal('Warning!', `Ballot ${ballotKeysProp} is empty`, 'warning')
          commonStore.hideLoading()
          return false
        }
      }

      let isAffectedKeyAddress = contractsStore.web3Instance.isAddress(ballotStore.ballotKeys.affectedKey)

      if (!isAffectedKeyAddress) {
        swal('Warning!', messages.AFFECTED_KEY_IS_NOT_ADDRESS_MSG, 'warning')
        commonStore.hideLoading()
        return false
      }

      let isMiningKeyAddress = contractsStore.web3Instance.isAddress(ballotStore.ballotKeys.miningKey.value)
      if (!isMiningKeyAddress) {
        swal('Warning!', messages.MINING_KEY_IS_NOT_ADDRESS_MSG, 'warning')
        commonStore.hideLoading()
        return false
      }
    }

    if (ballotStore.isBallotForMinThreshold) {
      for (let ballotMinThresholdProp in ballotStore.ballotMinThreshold) {
        if (ballotStore.ballotMinThreshold[ballotMinThresholdProp].length === 0) {
          swal('Warning!', `Ballot ${ballotMinThresholdProp} is empty`, 'warning')
          commonStore.hideLoading()
          return false
        }
      }
    }

    if (ballotStore.isBallotForProxy) {
      for (let ballotProxyProp in ballotStore.ballotProxy) {
        if (ballotStore.ballotProxy[ballotProxyProp].length === 0) {
          swal('Warning!', `Ballot ${ballotProxyProp} is empty`, 'warning')
          commonStore.hideLoading()
          return false
        }
      }

      let isAddress = contractsStore.web3Instance.isAddress(ballotStore.ballotProxy.proposedAddress)

      if (!isAddress) {
        swal('Warning!', messages.PROPOSED_ADDRESS_IS_NOT_ADDRESS_MSG, 'warning')
        commonStore.hideLoading()
        return false
      }
    }

    if (!ballotStore.isBallotForKey && !ballotStore.isBallotForMinThreshold && !ballotStore.isBallotForProxy) {
      swal('Warning!', messages.BALLOT_TYPE_IS_EMPTY_MSG, 'warning')
      commonStore.hideLoading()
      return false
    }

    return true
  }

  createBallotForKeys = startTime => {
    const { ballotStore, contractsStore } = this.props
    const inputToMethod = {
      startTime: startTime,
      endTime: ballotStore.endTimeUnix,
      affectedKey: ballotStore.ballotKeys.affectedKey,
      affectedKeyType: ballotStore.ballotKeys.keyType,
      newVotingKey: ballotStore.ballotKeys.newVotingKey,
      newPayoutKey: ballotStore.ballotKeys.newPayoutKey,
      miningKey: ballotStore.ballotKeys.miningKey.value,
      ballotType: ballotStore.ballotKeys.keysBallotType,
      memo: ballotStore.memo
    }
    let data
    if (
      inputToMethod.ballotType === ballotStore.KeysBallotType.add &&
      inputToMethod.affectedKeyType === ballotStore.KeyType.mining &&
      (inputToMethod.newVotingKey || inputToMethod.newPayoutKey)
    ) {
      data = contractsStore.votingToChangeKeys.createBallotToAddNewValidator(inputToMethod)
    } else {
      data = contractsStore.votingToChangeKeys.createBallot(inputToMethod)
    }
    return data
  }

  createBallotForMinThreshold = startTime => {
    const { ballotStore, contractsStore } = this.props
    const inputToMethod = {
      startTime: startTime,
      endTime: ballotStore.endTimeUnix,
      proposedValue: ballotStore.ballotMinThreshold.proposedValue,
      memo: ballotStore.memo
    }
    return contractsStore.votingToChangeMinThreshold.createBallot(inputToMethod)
  }

  createBallotForProxy = startTime => {
    const { ballotStore, contractsStore } = this.props
    const inputToMethod = {
      startTime: startTime,
      endTime: ballotStore.endTimeUnix,
      proposedValue: ballotStore.ballotProxy.proposedAddress,
      contractType: ballotStore.ballotProxy.contractType,
      memo: ballotStore.memo
    }
    return contractsStore.votingToChangeProxy.createBallot(inputToMethod)
  }

  onClick = async () => {
    const { commonStore, contractsStore, ballotStore, ballotsStore } = this.props
    const { push } = this.props.routing
    commonStore.showLoading()
    const isValidVotingKey = contractsStore.isValidVotingKey
    if (!isValidVotingKey) {
      commonStore.hideLoading()
      swal('Warning!', messages.invalidVotingKeyMsg(contractsStore.votingKey), 'warning')
      return
    }
    const isFormValid = this.checkValidation()
    if (isFormValid) {
      if (ballotStore.ballotType === ballotStore.BallotType.keys) {
        const inputToAreBallotParamsValid = {
          affectedKey: ballotStore.ballotKeys.affectedKey,
          affectedKeyType: ballotStore.ballotKeys.keyType,
          miningKey: ballotStore.ballotKeys.miningKey.value,
          ballotType: ballotStore.ballotKeys.keysBallotType
        }
        let areBallotParamsValid = await contractsStore.votingToChangeKeys.areBallotParamsValid(
          inputToAreBallotParamsValid
        )
        if (!areBallotParamsValid) {
          commonStore.hideLoading()
          return swal('Warning!', 'The ballot input params are invalid', 'warning')
        }
      }

      let methodToCreateBallot
      let contractType
      let contractInstance
      //let web3 = new Web3(contractsStore.web3Instance.currentProvider)
      switch (ballotStore.ballotType) {
        case ballotStore.BallotType.keys:
          methodToCreateBallot = this.createBallotForKeys
          contractType = 'votingToChangeKeys'
          contractInstance = contractsStore.votingToChangeKeys.votingToChangeKeysInstance
          break
        case ballotStore.BallotType.minThreshold:
          methodToCreateBallot = this.createBallotForMinThreshold
          contractType = 'votingToChangeMinThreshold'
          contractInstance = contractsStore.votingToChangeMinThreshold.votingToChangeMinThresholdInstance
          break
        case ballotStore.BallotType.proxy:
          methodToCreateBallot = this.createBallotForProxy
          contractType = 'votingToChangeProxy'
          contractInstance = contractsStore.votingToChangeProxy.votingToChangeProxyInstance
          break
        default:
          break
      }

      const startTime = this.getStartTimeUnix()

      sendTransactionByVotingKey(
        this.props,
        contractInstance.options.address,
        methodToCreateBallot(startTime),
        async tx => {
          const events = await contractInstance.getPastEvents('BallotCreated', {
            fromBlock: tx.blockNumber,
            toBlock: tx.blockNumber
          })
          const newId = Number(events[0].returnValues.id)
          const card = await contractsStore.getCard(newId, contractType)
          ballotsStore.ballotCards.push(card)

          swal('Congratulations!', messages.BALLOT_CREATED_SUCCESS_MSG, 'success').then(result => {
            push(`${commonStore.rootPath}`)
            window.scrollTo(0, 0)
          })
        },
        messages.BALLOT_CREATE_FAILED_TX
      )
    }
  }

  menuItemActive = ballotType => {
    const { ballotStore } = this.props
    if (ballotType == ballotStore.ballotType) {
      return 'ballot-types-i ballot-types-i_active'
    } else {
      return 'ballot-types-i'
    }
  }

  render() {
    const { contractsStore, ballotStore } = this.props
    let validator = ballotStore.isNewValidatorPersonalData ? <Validator /> : ''
    let keysTypes = ballotStore.isBallotForKey ? <KeysTypes /> : ''
    let metadata
    let minThreshold = 0
    switch (ballotStore.ballotType) {
      case ballotStore.BallotType.keys:
        metadata = <BallotKeysMetadata />
        minThreshold = contractsStore.keysBallotThreshold
        break
      case ballotStore.BallotType.minThreshold:
        metadata = <BallotMinThresholdMetadata />
        minThreshold = contractsStore.minThresholdBallotThreshold
        break
      case ballotStore.BallotType.proxy:
        metadata = <BallotProxyMetadata />
        minThreshold = contractsStore.proxyBallotThreshold
        break
      default:
        break
    }
    return (
      <section className="container new">
        <h1 className="title">New Ballot</h1>
        <form action="" className="new-form">
          <div className="new-form-side new-form-side_left">
            <div className="ballot-types">
              <div
                className={this.menuItemActive(ballotStore.BallotType.keys)}
                onClick={e => ballotStore.changeBallotType(e, ballotStore.BallotType.keys)}
              >
                Validator Management Ballot
              </div>
              <div
                className={this.menuItemActive(ballotStore.BallotType.minThreshold)}
                onClick={e => ballotStore.changeBallotType(e, ballotStore.BallotType.minThreshold)}
              >
                Consensus Threshold Ballot
              </div>
              <div
                className={this.menuItemActive(ballotStore.BallotType.proxy)}
                onClick={e => ballotStore.changeBallotType(e, ballotStore.BallotType.proxy)}
              >
                Modify Proxy Contract Ballot
              </div>
            </div>
            <div className="info">
              <p className="info-title">Information of the ballot</p>
              <div className="info-i">
                Minimum {minThreshold} from {contractsStore.validatorsLength} validators required to pass the proposal<br />
              </div>
              <div className="info-i">
                You can create {contractsStore.validatorLimits.keys} ballot for keys<br />
              </div>
              <div className="info-i">
                You can create {contractsStore.validatorLimits.minThreshold} ballot for consensus<br />
              </div>
              <div className="info-i">
                You can create {contractsStore.validatorLimits.proxy} ballot for proxy<br />
              </div>
            </div>
          </div>
          <div className="new-form-side new-form-side_right">
            <div className="form-el">
              <label>Description of the ballot</label>
              <div>
                <textarea rows="4" value={ballotStore.memo} onChange={e => ballotStore.setMemo(e)} />
              </div>
            </div>
            <hr />
            <div className="hidden">
              <div className="left">
                <div className="radio-container">
                  <input
                    type="radio"
                    name="ballot-type"
                    id="ballot-for-validators"
                    value={ballotStore.BallotType.keys}
                    checked={ballotStore.isBallotForKey}
                    onChange={e => ballotStore.changeBallotType(e, ballotStore.BallotType.keys)}
                  />
                  <label htmlFor="ballot-for-validators" className="radio">
                    Validator Management Ballot
                  </label>
                  <p className="hint">Ballot to add, remove or swap any type of key for existing or new validators.</p>
                </div>
              </div>
              <div className="right">
                <div className="radio-container">
                  <input
                    type="radio"
                    name="ballot-type"
                    id="ballot-for-consensus"
                    value={ballotStore.BallotType.minThreshold}
                    checked={ballotStore.isBallotForMinThreshold}
                    onChange={e => ballotStore.changeBallotType(e, ballotStore.BallotType.minThreshold)}
                  />
                  <label htmlFor="ballot-for-consensus" className="radio">
                    Consensus Threshold Ballot
                  </label>
                  <p className="hint">Ballot to change the minimum threshold for consensus to vote for keys.</p>
                </div>
              </div>
              <div className="left">
                <div className="radio-container">
                  <input
                    type="radio"
                    name="ballot-type"
                    id="ballot-for-proxy"
                    value={ballotStore.BallotType.proxy}
                    checked={ballotStore.isBallotForProxy}
                    onChange={e => ballotStore.changeBallotType(e, ballotStore.BallotType.proxy)}
                  />
                  <label htmlFor="ballot-for-proxy" className="radio">
                    Modify Proxy Contract Ballot
                  </label>
                  <p className="hint">Ballot to change one of the proxy contracts.</p>
                </div>
              </div>
            </div>
            <hr />
            {validator}
            {keysTypes}
            {metadata}
            <button type="button" className="add-ballot" onClick={e => this.onClick(e)}>
              Add ballot
            </button>
          </div>
        </form>
      </section>
    )
  }
}
