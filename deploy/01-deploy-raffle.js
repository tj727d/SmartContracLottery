const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
require("dotenv").config();
const { verify } = require("../utils/verify");

const VRF_SUBSCRIPTION_FUND_AMOUNT = ethers.utils.parseEther("30");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    //pulls named accounts from hardhat.config and takes the deployer account that is specified
    const { deployer } = await getNamedAccounts(); //get the deployer account specefied in hardhatconfig
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subscriptionId;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock"); // gets the address of thevrf contract from the dev chain
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        //programatically subscribe the contract to chainlink vrf
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.events[0].args.subId;
        //Fund the subscription (usually in link for a real chain)
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUBSCRIPTION_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }
    const enteranceFee = networkConfig[chainId]["enteranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const interval = networkConfig[chainId]["interval"];
    const args = [
        vrfCoordinatorV2Address,
        enteranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]; //args for the contract's constructor
    const raffel = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfrimations: network.config.blockConfirmations || 1,
    });
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("VERIFYING...");
        await verify(raffel.address, args);
    }
    console.log("----------------------------------");
};

module.exports.tags = ["all", "raffle"];
