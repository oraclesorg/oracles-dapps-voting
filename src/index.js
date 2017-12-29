import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Router, Route } from 'react-router-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { Provider } from 'mobx-react';
import { RouterStore, syncHistoryWithStore } from 'mobx-react-router';
import commonStore from './stores/CommonStore';
import validatorStore from './stores/ValidatorStore';
import ballotStore from './stores/BallotStore';
import ballotsStore from './stores/BallotsStore';
import contractsStore from './stores/ContractsStore';
import swal from 'sweetalert2';
import getWeb3 from './getWeb3';
import "babel-polyfill";
import createBrowserHistory from 'history/createBrowserHistory'

const browserHistory = createBrowserHistory();
const routingStore = new RouterStore();
const stores = { commonStore, contractsStore, ballotStore, ballotsStore, validatorStore, routing: routingStore };
const history = syncHistoryWithStore(browserHistory, routingStore);

class AppMainRouter extends Component {

  constructor(props) {
    super(props);
    commonStore.showLoading();

    getWeb3().then(async (web3Config) => {
      contractsStore.setWeb3Instance(web3Config);
      await contractsStore.setPoaConsensus(web3Config);
      contractsStore.setBallotsStorage(web3Config);
      contractsStore.getValidatorsLength();
      await contractsStore.getKeysBallotThreshold();
      contractsStore.getMinThresholdBallotThreshold();
      contractsStore.getProxyBallotThreshold();
      contractsStore.setVotingToChangeKeys(web3Config);
      contractsStore.setVotingToChangeMinThreshold(web3Config);
      contractsStore.setVotingToChangeProxy(web3Config);
      contractsStore.setValidatorMetadata(web3Config);
      contractsStore.setVotingKey(web3Config);
      contractsStore.getAllKeysBallots();
      contractsStore.getAllMinThresholdBallots();
      contractsStore.getAllProxyBallots();
      await contractsStore.setMiningKey(web3Config);
      console.log("votingKey", contractsStore.votingKey)
      console.log("miningKey", contractsStore.miningKey)
    }).catch((error) => {
      commonStore.hideLoading();
      swal({
        icon: 'error',
        title: 'Error',
        html: error.message,
        type: 'error'
      });
    });
  }

  render(){
    return (
      <Provider { ...stores }>
        <Router history={history}>
          <Route component={App} />
        </Router>
      </Provider>
    )
  }

}

ReactDOM.render(<AppMainRouter />, document.getElementById('root'));
registerServiceWorker();
