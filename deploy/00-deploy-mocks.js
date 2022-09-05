const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25"); //0.35 is the premium. It costs 0.25 link per request to the vrf contract
const GAS_PRICE_LINK = 1e9; //calculated value based on the gas price of the chain(link/gas)

module.exports = async (hre) => {
    const { getNamedAccounts, deployments } = hre;

    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK];

    //only deploy mocks to local testnets
    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deployin Mock Contracts...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        });
        log("Mocks deployed!");
        log("---------------------------------------------------------");
    }
};

//allows you to choose to deploy all contracts or just mocks
module.exports.tags = ["all", "mocks"];
