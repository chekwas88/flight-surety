var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "chief limb giraffe must trim label present thing abuse road hover sick";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 6721975,
      gasPrice: 100000000000,
    }
  },
  compilers: {
    solc: {
      version: "^0.5.0"
    }
  }
};

