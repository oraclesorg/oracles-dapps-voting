import { messages } from "../messages";
import { addressesURL, wrongRepoAlert } from "./helpers";
import swal from 'sweetalert2';
// const local = {
//     VOTING_TO_CHANGE_KEYS_ADDRESS: '0xecdbe3937cf6ff27f70480855cfe03254f915b48',
//     VOTING_TO_CHANGE_MIN_THRESHOLD_ADDRESS: '0x5ae30d4c8892292e0d8164f87a2e12dff9dc99e1',
//     VOTING_TO_CHANGE_PROXY_ADDRESS: '0x6c221df3695ac13a7f9366568ec069c353d273b8',
//     BALLOTS_STORAGE_ADDRESS: '0x5d6573e62e3688e40c1fc36e01b155fb0006f432',
//     METADATA_ADDRESS: '0x93eba9d9de66133fcde35775e9da593edd59a4e3',
//     POA_ADDRESS: '0xf472e0e43570b9afaab67089615080cf7c20018d',
// }

let SOKOL_ADDRESSES = {};
let CORE_ADDRESSES = {};

function getContractsAddresses(branch) {
    let addr = addressesURL(branch);
    fetch(addr).then(function(response) { 
        return response.json();
    }).then(function(contracts) {
        switch (branch) {
            case 'core':
                CORE_ADDRESSES = contracts;
                break;
            case 'sokol':
                SOKOL_ADDRESSES = contracts;
                break;
            default:
                CORE_ADDRESSES = contracts;
                break;
        }
    }).catch(function(err) {
        wrongRepoAlert(addr);
    });
}

getContractsAddresses('core');
getContractsAddresses('sokol');

module.exports = (netId) => {
    switch (netId) {
        case '77':
            return SOKOL_ADDRESSES
        case '99':
            return CORE_ADDRESSES
        default:
            return CORE_ADDRESSES
    }
}


