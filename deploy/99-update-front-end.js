const { ethers, network } = require("hardhat");
const fs = require("fs");
//Use this script to update the front end of your dapp based on revisions to your smart contracts

const FRONT_END_ADDRESSES_FILE =
    "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../nextjs-smartcontract-lottery-fcc/constants/abi.json";

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating Front End...");
        updateContractAddresses();
        updateAbi();
    }
};

const updateAbi = async () => {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json));
};

//Update the contract address in the frontend with the new address
const updateContractAddresses = async () => {
    const raffle = await ethers.getContract("Raffle");
    const chainId = network.config.chainId.toString();
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"));
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(raffle.address)) {
            currentAddresses[chainId].push(raffle.address);
        }
    }
    {
        currentAddresses[chainId] = [raffle.address];
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
};

module.exports.tags = ["all", "frontend"];
