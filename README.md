set up:

1. create a new folder
2. add hardhat to the folder with yarn add --dev hardhat
3. run yarn hard hat to create the hardhat project by running yarn hardhat and select create an empty hardhat config.js
4. install the following dependencies yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv
5. add your requires (packages) to your hardhat.config
6. add .prettierrc files to customize prettier
7. update the solidity version in hardhat.config to the latest stable version (currently 0.8.7)
8. create new folder for your contracts
9. write the raffel contract
    1.

chainlink vrf

1. create a subscription at vrf.chain.link/new
2. add funds to the subscription
3. add VRFv2Consumer.sol to your contract
4.
