// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title DEX Template
 * @author stevepham.eth and m00npapi.eth
 * @notice Empty DEX.sol that just outlines what features could be part of the challenge (up to you!)
 * @dev We want to create an automatic market where our contract will hold reserves of both ETH and 🎈 Balloons. These reserves will provide liquidity that allows anyone to swap between the assets.
 * NOTE: functions outlined here are what work with the front end of this branch/repo. Also return variable names that may need to be specified exactly may be referenced (if you are confused, see solutions folder in this repo and/or cross reference with front-end code).
 */
contract DEX {
    /* ========== GLOBAL VARIABLES ========== */

    using SafeMath for uint256; //outlines use of SafeMath for uint256 variables
    IERC20 token; //instantiates the imported contract
    uint256 public totalLiquidity; //total liquidity in the contract
    mapping (address => uint256) public liquidity; //mapping of liquidity of each user
    bool public contractInitialzed; //string to check if contract is initialized
    /* ========== EVENTS ========== */
    /**
    * @notice Modifier to check if contract is initialized
     */
    modifier onlyInitialized() {
        require(contractInitialzed, "Contract not initialized");
        _;
    }

     /**
     * @notice Emitted when init() called and contract is initialized
     */
    event DexInitialized(
        bool _contractInitialized,
        uint256 _tokens, 
        uint256 _totalLiquidity
    );

    /**
     * @notice Emitted when ethToToken() swap transacted
     */
    event EthToTokenSwap(
        address indexed _from,
        string _trade,
        uint256 _ethIn,
        uint256 _tokensOut
    );

    /**
     * @notice Emitted when tokenToEth() swap transacted
     */
    event TokenToEthSwap(
        address indexed _from,
        string _trade,
        uint256 _tokensIn,
        uint256 _ethOut
    );

    /**
     * @notice Emitted when liquidity provided to DEX and mints LPTs.
     */
    event LiquidityProvided(
        address indexed _provider,
        uint256 _tokenAmount,
        uint256 _ethAmount,
        uint256 _liquidityMinted        
    );

    /**
     * @notice Emitted when liquidity removed from DEX and decreases LPT count within DEX.
     */
    event LiquidityRemoved(
        address indexed _provider,
        uint256 _liquidityBurned,
        uint256 _ethAmount,
        uint256 _tokenAmount
    );

    /* ========== CONSTRUCTOR ========== */

    constructor(address token_addr) public {
        token = IERC20(token_addr); //specifies the token address that will hook into the interface and be used through the variable 'token'
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice initializes amount of tokens that will be transferred to the DEX itself from the erc20 contract mintee (and only them based on how Balloons.sol is written). Loads contract up with both ETH and Balloons.
     * @param tokens amount to be transferred to DEX
     * @return totalLiquidity is the number of LPTs minting as a result of deposits made to DEX contract
     * NOTE: since ratio is 1:1, this is fine to initialize the totalLiquidity (wrt to balloons) as equal to eth balance of contract.
     */
    function init(uint256 tokens) public payable returns (uint256) {
        require(totalLiquidity == 0, "DEX: already initialized"); //ensures that the DEX contract has not already been initialized
        require(msg.value > 0, "Amount of ETH sent to DEX must be more than 0");
        require(token.transferFrom(msg.sender, address(this), tokens) , "The Ballons did not transfer to the DEX" );
        require(tokens > 0, "Amount of Balloons sent to DEX must be more than 0");
        totalLiquidity = address(this).balance; // sets the total liquidity to the amount of ETH in the contract
        liquidity[msg.sender] = totalLiquidity; //sets the liquidity of the sender to the total liquidity
        contractInitialzed = true; //sets the contractInitialized variable to true
        emit LiquidityProvided(msg.sender, tokens, msg.value,  totalLiquidity); //emits the event that liquidity has been provided
        emit DexInitialized(contractInitialzed, tokens, totalLiquidity); //emits the event that the DEX has been initialized
        return totalLiquidity; //returns the total liquidity
    }

    /**
     * @notice returns yOutput, or yDelta for xInput (or xDelta)
     * @dev Follow along with the [original tutorial](https://medium.com/@austin_48503/%EF%B8%8F-minimum-viable-exchange-d84f30bd0c90) Price section for an understanding of the DEX's pricing model and for a price function to add to your contract. You may need to update the Solidity syntax (e.g. use + instead of .add, * instead of .mul, etc). Deploy when you are done.
     dy=y*dx/(x+dx)
     yOutput = yReserves * xInput / (xReserves + xInput)
     */
    function price(
        uint256 xInput, 
        uint256 xReserves,
        uint256 yReserves
    ) public onlyInitialized view returns (uint256 yOutput) {  
        uint256 xInputWithFee = xInput.mul(997);
        // uint256 xInputWithFee = xInput; // without fee
        uint256 numerator = xInputWithFee.mul(yReserves);
        uint256 denominator = xReserves.mul(1000).add(xInputWithFee);
        // uint256 denominator = xReserves.add(xInputWithFee); // wihout fee
        return (numerator.div(denominator));
    }

    /**
     * @notice returns liquidity for a user. Note this is not needed typically due to the `liquidity()` mapping variable being public and having a getter as a result. This is left though as it is used within the front end code (App.jsx).
     * if you are using a mapping liquidity, then you can use `return liquidity[lp]` to get the liquidity for a user.
     *
     */
    function getLiquidity(address lp) public view returns (uint256) {
        return liquidity[lp];
    }

    /**
     * @notice sends Ether to DEX in exchange for $BAL
     */
    function ethToToken () public onlyInitialized payable returns (uint256 tokenOutput) {
        uint256 tokenReserves = token.balanceOf(address(this));
        uint256 ethReserves = address(this).balance.sub(msg.value); // I am subtracting ETH from the contract balance, because I want to get reseves before I have added the ETH from the msg.value 
        uint256 tokenAmountPurchased = price(msg.value, ethReserves, tokenReserves);
        require(msg.value > 0, "Amount of ETH sent to DEX must be more than 0");
        require(token.transfer(msg.sender, tokenAmountPurchased), "The Ballons did not transfer to the user" );
        emit EthToTokenSwap(msg.sender, "EthToTokenSwap" , msg.value, tokenAmountPurchased);
        return tokenAmountPurchased;
    }

    /**
     * @notice sends $BAL tokens to DEX in exchange for Ether
     */
    function tokenToEth(uint256 tokenInput) public onlyInitialized returns (uint256 ethOutput) {
        uint256 tokenReserves = token.balanceOf(address(this));
        uint256 ethReserves = address(this).balance;
        uint256 ethAmountPurchased = price(tokenInput, tokenReserves ,ethReserves );
        require(tokenInput > 0, "Amount of Balloons sent to DEX must be more than 0");
        require(token.transferFrom(msg.sender, address(this), tokenInput), "The Ballons did not transfer to the DEX" );
        (bool sent,) = msg.sender.call{value: ethAmountPurchased}("");
        require(sent, "Failed to send Ether");
        emit TokenToEthSwap(msg.sender, "TokenToEthSwap", ethAmountPurchased, tokenInput);
        return ethAmountPurchased;
    }

    /**
     * @notice allows deposits of $BAL and $ETH to liquidity pool
     * NOTE: parameter is the msg.value sent with this function call. That amount is used to determine the amount of $BAL needed as well and taken from the depositor.
     * NOTE: user has to make sure to give DEX approval to spend their tokens on their behalf by calling approve function prior to this function call.
     * NOTE: Equal parts of both assets will be removed from the user's wallet with respect to the price outlined by the AMM.
     */
     // let dx = msg.value = ETH <> and dy = tokenInput = BAL
    function deposit() public onlyInitialized payable returns (uint256 tokensDeposited) {
        require(msg.value > 0, "Amount of ETH sent to DEX must be more than 0");
        // getting all states
        uint256 ethReserves = address(this).balance.sub(msg.value);
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethInput = msg.value;
        uint256 tokenInput;
        // calculating the amount of LP tokens to mint
        uint256 lpToMint = totalLiquidity.mul(ethInput).div(ethReserves);
        // calculating the amount of BAL tokens to send to the DEX
        tokenInput = (ethInput.mul(tokenReserve)).div(ethReserves).add(1);
        // updating the total liquidity
        totalLiquidity = totalLiquidity.add(lpToMint);
        // updating the liquidity of the sender
        liquidity[msg.sender] = liquidity[msg.sender].add(lpToMint);
        // transfering the tokens to the DEX and if not enough tokens are sent, the transaction will revert
        require(token.transferFrom(msg.sender, address(this), tokenInput), "DEX did not receive BAL tokens");
        // emitting the event
        emit LiquidityProvided(msg.sender, tokenInput ,ethInput, lpToMint);
        return tokenInput;
    }

    /**
     * @notice allows withdrawal of $BAL and $ETH from liquidity pool
     * NOTE: with this current code, the msg caller could end up getting very little back if the liquidity is super low in the pool. I guess they could see that with the UI.
     */
     // dx=(x*(amount))/(totalLiquidity)
     // dy(y*(amount))/(totalLiquidity)

    function withdraw(uint256 amount) public onlyInitialized returns (uint256 eth_amount, uint256 token_amount) {
        require(amount > 0, "Amount of LP tokens must be more than 0");
        require(amount <= liquidity[msg.sender], "Amount of LP tokens must be less than the sender holds");
        // calculate how much eth and bal i would get for my shar of LP tokens
        // asigning variables
        uint256 totalEthAmount = address(this).balance;
        uint256 totalTokenAmount = token.balanceOf(address(this));
        // getting the amount of ETH and BAL tokens I will get out for the amount of LP tokens I have
        uint256 ethAmountOut = (totalEthAmount.mul(amount)).div(totalLiquidity);
        uint256 tokenAmountOut = (totalTokenAmount.mul(amount)).div(totalLiquidity);
        (bool sent, ) = msg.sender.call{value: ethAmountOut}("");
        require(sent, "ETH not sent to the msg.sender");
        require(token.transfer(msg.sender, tokenAmountOut), "BAL not transfered to the msg.sender");
        liquidity[msg.sender] = liquidity[msg.sender].sub(amount);
        totalLiquidity = totalLiquidity.sub(amount);
        emit LiquidityRemoved(msg.sender, amount, ethAmountOut, tokenAmountOut);
        return (ethAmountOut, tokenAmountOut);
    }
}
