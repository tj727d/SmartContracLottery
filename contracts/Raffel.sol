// Raffle

// Enter the lottery (play some amount)
// Pick a random winner (verifiably random w/ cainlink vrf)
// Winner to be selected every x minutes -> completly automated (selection using chainlink keepers)

//Chainlink Oracle -> Randomness, automated execution (Chainlink keepers)

//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

/*Imports*/
// KeeperCompatible.sol imports the functions from both ./KeeperBase.sol and
// ./interfaces/KeeperCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

//custom errors
error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/** @title A sample Raffle Contract
 *  @author TJ D'Alessadnro
 *  @notice This contract is for createing an untamperable decentralized smart contract
 *  @dev This Contract implements chalink VRF v2 and Chainlink Keepers
 */

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface{
    /*Types*/
    //enums can be used to create custom types with a finite set of 'constant values' which acts as a new type
    //they are an abstraction of a uint256 that is keeping track of a bit representing your current "state"
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    /*State Variables stored on the blockchain (gas expensive)*/
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;//keyhash that sets a ceiling for the amount of gas the vrf can use
    uint64 private immutable i_subscriptionId;//the subscription id needed for funding requests
    uint16 private constant REQUEST_CONFIRMATIONS = 3; // number of confirmations for the vrf node to wait to send the random numbers
    uint32 private immutable i_callbackGasLimit;//limit for how much gas our vrf call can use
    uint32 private constant NUM_WORDS = 1;//how many random numbers we want to get

    //Lottery Variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private i_interval;

    /*Events*/
    //Events Allow logging to the Ethereum blockchain
    //These logs can be read off the blockchain and are a cheaper form of storage than state variables
    //these logs are not accessible by smart contracts and are used for things like front end applications
    //So instead of constantly reading state variables a front end can just listen for events to update its state

    //There are 2 types of parameters for an event, indexed(topics) and non indexed parameters
    //you can have upto 3 indexed parameters or topics for an event(these are easier to search)
    //non indexed parameters are abi encoded which means you need to know the contracts abi in order to decode them

    //Used for:
    //1. Listening for events and updating user interface
    //2. A cheap form of storage

    //name your events with the reverse of the function name that emits

    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

// The constructor is an optional function that is executed upon contract creation.

    constructor(
        address vrfCoordinatorV2, //contract (needs a mock for hardhat test chain)
        uint256 enteranceFee, 
        bytes32 gasLane, 
        uint64 subscriptionId, 
        uint32 callbackGasLimit, 
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2){
        i_entranceFee = enteranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;

    }
/* Functions */
    function enterRaffle() public payable{
        //require msg.value > i_enteranceFee
        if(msg.value < i_entranceFee){
            revert Raffle__NotEnoughETHEntered();
        }
        // if raffle isn't open revert
        if(s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
        }
        //add msg.sender to the players array to keep track of who has entered the raffle
        s_players.push(payable(msg.sender));
        
        //Events
        // whenever you update a dynamic object, like an array or a mapping, we always want to emmit an event
        //events allow you to print to the evem log structure
        //events are useful as they allow us to print data without using a ostly storage variable and are still tied to a smart contract
        //name events with the function name reversed
        emit RaffleEnter(msg.sender);

    }
    /** 
     * @dev This is the function that the chainlink keeper nodes call
     * they look for the `upkeepNeeded` to return true.
     * The following should be true in order to return true:
     * 1. Our time interval should have passed
     * 2. The lottery should have at least one player, and have some ETH
     * 3. Our subscription is funded with LINK
     * 4. The lottery should be in an "open" state
     */

    function checkUpkeep(bytes memory /* checkData */) /*external*/ public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
        //block.timestamp return the current timestamp of the blockchain
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0); 
        bool hasBalance = address(this).balance > 0;//the balance of this contract > 0

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);

    }

//requests a random winner once the keeper calls the function
    function performUpkeep(bytes calldata /* performData */) external override{
        //run check up keep function and see what it returns 
        (bool upkeepNeeded,) = checkUpkeep("");
        if(!upkeepNeeded){
            revert Raffle__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_raffleState));
        }

        //Request random number
        //this is a 2 transaction process so the number can't be manipulated
        s_raffleState = RaffleState.CALCULATING;
        //make call to to get random words (random numbers from chainlink vrf)
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
        i_gasLane, //gaslane max price you're willing to pay to request a random word
        i_subscriptionId,
        REQUEST_CONFIRMATIONS,
        i_callbackGasLimit,//limit on the gas the callback function(fulfill random words) can use 
        NUM_WORDS
        );
        //once we get the random umber do something with it
        emit RequestedRaffleWinner(requestId);
            //Use random number
            //2 transaction process
    }

    //overrides function from VRFConsumerBaseV2
    //Called whe nthe random number is recieved from requestRandomWords
    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) internal override{
        //put storage variables in memory to save gas
        //address[] memory players = s_players;
        //get the random number from the chainlink vrf and modulo it with the length of the winners array to get index of random winner 
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        //Set most recent winner
        s_recentWinner = recentWinner;
        //pay most recent winner
        (bool callSuccess, ) = recentWinner.call{
            value: address(this).balance
        }("");
        if(!callSuccess){
            revert Raffle__TransferFailed();
        }
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        emit WinnerPicked(recentWinner);
    }

/* View/Pure functions*/
/*
 - View function declares that no state will be changed.
 - Pure function declares that no state variable will be changed or read.
 */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns(address){
        return(s_players[index]);
    }

    function getRecentWinner() public view returns (address){
        return(s_recentWinner);
    }

    function getRaffleState() public view returns (RaffleState){
        return(s_raffleState);
    }
    function getNumWords() public pure returns (uint256){
        return(NUM_WORDS);
    }
    function getNumberOfPlayers() public view returns (uint256){
        return(s_players.length);
    }
    function getLatestTimestamp() public view returns (uint256){
        return(s_lastTimeStamp);
    }
    function getRequestConfirmations() public pure returns (uint256){
        return(REQUEST_CONFIRMATIONS);
    }
        function getInterval() public view returns (uint256){
        return(i_interval);
    }
}
