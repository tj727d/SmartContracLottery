const { network, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

//Run testss if on a dev chain
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleEntranceFee, deployer;

          beforeEach(async () => {
              //Grab the account to deploy the contracts
              deployer = (await getNamedAccounts()).deployer;
              //get the contracts
              raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await raffle.getEnteranceFee();
          });
          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...");
                  const startingTimeStamp = await raffle.getLatestTimestamp();
                  const accounts = await ethers.getSigners();
                  const winnerStartingBalance = await accounts[0].getBalance();
                  console.log("Setting up Listener...");
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              const endingTimeStamp = await raffle.getLatestTimestamp();

                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(recentWinner.toString(), accounts[0].address);
                              assert.equal(raffleState, 0);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(error);
                          }
                      });
                      // Then entering the raffle
                      console.log("Entering Raffle...");
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                      await tx.wait(1);
                      console.log("Ok, time to wait...");

                      // and this code WONT complete until our listener has finished listening!
                  });
              });
          });
      });
