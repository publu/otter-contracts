require('dotenv').config()

require('@nomiclabs/hardhat-waffle')
require('@atixlabs/hardhat-time-n-mine')
require('@nomiclabs/hardhat-etherscan')
require('dotenv').config()

const { ethers } = require('ethers')

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
      },
      {
        version: '0.7.5',
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    'polygon-mainnet': {
      url: 'https://polygon-rpc.com',
      accounts: [String(process.env.MATIC_KEY)],
      gasPrice: 35000000000,
    },
    'polygon-mumbai': {
      url: 'https://polygon-mumbai.infura.io/v3/d7dae60b5e1d40b9b31767b0086aa75d',
      accounts: [String(process.env.MATIC_KEY)],
      gas: 'auto',
      gasPrice: ethers.utils.parseUnits('1.2', 'gwei').toNumber(),
    },
    one : {
      url: 'https://api.harmony.one',
      accounts: [String(process.env.MATIC_KEY)],
    },
    hardhat: {
      gas: 'auto',
      forking: {
        url: 'https://polygon-rpc.com'
      }
    },
  },  mocha: {
    timeout: 5 * 60 * 10000,
  },
}
