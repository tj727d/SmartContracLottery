require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");

// Network RPC URLs
const RINKEBY_URL = process.env.RINKEBY_URL || "https://eth-rinkeby";

//Network Private keys
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";

const GAS_REPORT = process.env.GAS_REPORT || false;

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        localhost: {
            chainId: 31337,
        },
        rinkeby: {
            url: RINKEBY_URL,
            accounts: [PRIVATE_KEY],
            chainId: 4,
            blockConfirmations: 6,
            saveDeployments: true,
        },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: GAS_REPORT,
        currency: "USD",
        outputFile: "gas-report.txt",
    },
    contractSizer: {
        runOnCompile: false,
        only: ["Raffle"],
    },
    solidity: "0.8.7",
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 500000,
    },
};
