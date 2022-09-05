const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

//Run testss if on a dev chain
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, VRFCoordinatorV2Mock, raffleEntranceFee, deployer, interval;
          const chainId = network.config.chainId;
          beforeEach(async () => {
              //Grab the account to deploy the contracts
              deployer = (await getNamedAccounts()).deployer;
              //deploy all contracts
              await deployments.fixture(["all"]);
              //get the contracts
              raffle = await ethers.getContract("Raffle", deployer);
              VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              raffleEntranceFee = await raffle.getEnteranceFee();
              interval = await raffle.getInterval();
          });
          //Tests
          describe("Constructor", () => {
              it("initializes the raffle correctly", async () => {
                  //Ideally tests have 1 assert per "it"
                  //call view functions of the contract to get the values set by the constructor
                  const raffleState = await raffle.getRaffleState();
                  const interval = await raffle.getInterval();
                  assert.equal(raffleState.toString(), "0");
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
              });
          });
          describe("Enter Raffle", () => {
              it("Reverts when you don't pay enough", async () => {
                  //send nothing to the enterRaffle function
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  );
              });
              it("Records players when the enter", async () => {
                  //send the enterance fee passed to the constructor to the enterRaffle function
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  //get the 0th player from the players array using the getPlayer view function in the contracr
                  const playerFromContract = await raffle.getPlayer(0);
                  //see if the deployer has entered the raffle
                  assert.equal(playerFromContract, deployer);
              });
              it("emit event on enter", async () => {
                  //look for the contract "raffle" tom emit the event "RaffleEnter" when the enterRafflle function is interacted with succesfully
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  );
              });
              it("doesn't allow enterance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  //increase the test blockchain time to simulate the time interval needed for the raffle to close
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  // mine the next block on the test blockchain
                  await network.provider.send("evm_mine", []);
                  //pretend to be a chainlink keeper and call performUpkeep
                  await raffle.performUpkeep([]);
                  //raffle should now be in a calculating state
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  );
              });
          });
          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any eth", async () => {
                  //force the test blockchain to go interval + 1 seconds into the future and mine the next block
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  //simulate calling checkUpkeep with callstatic to see how it will respond
                  const { upkeepNeeded } = raffle.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  //increase the test blockchain time to simulate the time interval needed for the raffle to close
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  // mine the next block on the test blockchain
                  await network.provider.send("evm_mine", []);
                  //pretend to be a chainlink keeper and call performUpkeep
                  await raffle.performUpkeep([]);

                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                  assert.equal(raffleState.toString(), "1");
                  assert.equal(upkeepNeeded, false);
              });
          });
          describe("performUpkeep", () => {
              it("it can only run if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  //increase the test blockchain time to simulate the time interval needed for the raffle to close
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  // mine the next block on the test blockchain
                  await network.provider.send("evm_mine", []);
                  //call performUpkeep
                  const tx = await raffle.performUpkeep([]);
                  //See if trransaction is successful
                  assert(tx);
              });
              it("it reverts when checkUpkeep is false", async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  );
              });
              it("updates the raffle state, emits an event, and calls the vrf coordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const txResponse = await raffle.performUpkeep("0x"); // emits requestId
                  const txReceipt = await txResponse.wait(1); // waits 1 block
                  const raffleState = await raffle.getRaffleState(); // updates state
                  const requestId = txReceipt.events[1].args.requestId;
                  assert(requestId.toNumber() > 0);
                  assert(raffleState == 1); // 0 = open, 1 = calculating
              });
          });
          describe("performUpkeep", () => {
              beforeEach(async () => {
                  //have someone enter the lottery
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  });
              });
              it("can only be called after preformUpkeep", async () => {
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
              });
              it("picks a winner, resets the lottery, and sends money", async () => {
                  //Pretty much testing that fulfillrandom words acts on the lotery as it should

                  //connect a few hardhat test accounts to the lottery and enter them into the raffle
                  const additionalEntrants = 3;
                  const startingAccountIndex = 1; //deployer = 0
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i]);
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                  }
                  const startingTimestamp = await raffle.getLatestTimestamp();
                  //preformUpkeep (mock being chainlink keepers)
                  //call fulfillRandomWords (movk being chainlink vrf)
                  //we will have to wait for fulfillrandomWords to be called

                  //create a promise so that the test doesn't finish before the event is fired
                  await new Promise(async (resolve, reject) => {
                      //once the winnerPicked event is triggered
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the event!");
                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              console.log(recentWinner);
                              console.log(accounts[0].address);
                              console.log(accounts[1].address);
                              console.log(accounts[2].address);
                              console.log(accounts[3].address);
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp = await raffle.getLatestTimestamp();
                              const numPlayers = await raffle.getNumberOfPlayers();
                              const winnerEndingBalance = await accounts[1].getBalance();
                              assert.equal(numPlayers.toString(), "0");
                              assert.equal(raffleState.toString(), "0");
                              assert(endingTimeStamp > startingTimestamp);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntranceFee
                                          .mul(additionalEntrants)
                                          .add(raffleEntranceFee)
                                          .toString()
                                  )
                              );
                          } catch (e) {
                              reject(e);
                          }
                          resolve();
                      });
                      //setting up listener
                      //below, we will fire the event, and the listener will pick it up, and resolve
                      const tx = await raffle.performUpkeep([]);
                      const txReceipt = await tx.wait(1);
                      //call fulfillRandomWords with the requestId and raffle address
                      const winnerStartingBalance = await accounts[1].getBalance();
                      await VRFCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
