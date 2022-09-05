const { ethers } = require("hardhat");

const networkConfig = {
    default: {
        name: "hardhat",
        keepersUpdateInterval: "30",
    },
    31337: {
        name: "hardhat",
        enteranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callbackGasLimit: "500000", //500,000 gas
        interval: "30", //30 second interval for the keeper to preform upkeep on the contract
    },
    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        enteranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "10050",
        callbackGasLimit: "500000", //500,000 gas
        interval: "30", //30 second interval for the keeper to preform upkeep on the contract
    },
};

const DECIMALS = 8;

const INITIAL_ANSWER = 200000000000;

const developmentChains = ["hardhat", "localhost"];

const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    DECIMALS,
    INITIAL_ANSWER,
};
