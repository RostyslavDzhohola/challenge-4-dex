/* eslint-disable no-unused-expressions */
/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */
/* eslint-disable no-undef */
const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { solidity } = require("@nomicfoundation/hardhat-chai-matchers");

/**
 * @notice auto-grading tests for simpleDEX challenge
 * Stages of testing are as follows: set up global test variables, test contract deployment, deploy contracts in beforeEach(), then actually test out each
 * separate function.
 * @dev this is still a rough WIP. See TODO: scattered throughout.'
 * @dev additional TODO: Write edge cases; putting in zero as inputs, or whatever.
 * @dev Harshit will be producing auto-grading tests in one of the next PRs. 
 */
describe("🚩 Challenge 4: ⚖️ 🪙 Simple DEX", function () {
  this.timeout(45000);

  let dexContract;
  let balloonsContract;
  let deployer;
  let user2;
  let user3;

  function deployNewInstance() {
    before('Deploying fresh cotract instance', async function () {
      [deployer, user2, user3] = await ethers.getSigners();
  
      await deployments.fixture(['Balloons', 'DEX']);
  
      dexContract = await ethers.getContract('DEX', deployer);
      balloonsContract = await ethers.getContract('Balloons', deployer);
      await balloonsContract.transfer( user2.address, "" + 10 * 10 ** 18 );
    });
  }

  function getEventValue(txReceipt, eventNumber) {
    const logDescr = dexContract.interface.parseLog(
      txReceipt.logs.find(log => log.address === dexContract.address)
    );
    const args = logDescr.args;
    return args[eventNumber]; // index of ethAmount in event
  }

  before((done) => {
    setTimeout(done, 2000);
  });

  describe("DEX: Standard Path", function () {
    /* TODO checking `price` calcs. Preferably calculation test should be provided by somebody who didn't implement this functions in 
    challenge to not reproduce mistakes systematically. */
    describe("Testing Swap functionality", function () {
      deployNewInstance();

      describe("ethToToken()", function () {
        it("Should send 1 Ether to DEX in exchange for _ $BAL", async function () {
          const dex_eth_start = await ethers.provider.getBalance(dexContract.address);

          const tx1 = await dexContract.ethToToken({value: ethers.utils.parseEther("1"),});
          // Reverts ethToToken() if the contract is not initialized
          await expect(tx1, "your functions shouldn't work without initalization").
            not.to.be.revertedWith("Contract not initialized");
          
          const tx1_receipt = await tx1.wait();
          const ethSent_1 = getEventValue(tx1_receipt, 2);

          const dex_eth_after = await ethers.provider.getBalance(dexContract.address);

          expect(ethSent_1, "If you get this error, check the order of your emited values or your emitor is after the return in your funcion").
            to.equal(dex_eth_after.sub(dex_eth_start));

          // Also figure out why/how to read the event that should be emitted with this too.
          /* Also, notice, that reference `DEX.sol` could emit *after* `return`, so that they're never emited. It's on your own to find and
          correct */

          expect(
            await ethers.provider.getBalance(dexContract.address)
          ).to.equal(ethers.utils.parseEther("6"));

        });

        it("Should revert if 0 ETH sent", async function () {
          await expect(dexContract.ethToToken({value: ethers.utils.parseEther("0"),})).to.be.reverted;
        });

        it("Should send less tokens after the first trade (ethToToken called)", async function () {
          const txUser2 = dexContract.connect(user2).ethToToken({
            value: ethers.utils.parseEther("1"),
          });
          const user2BalAfter = await balloonsContract.balanceOf(deployer.address);

          const txUser3 = dexContract.connect(user3.signer).ethToToken({
            value: ethers.utils.parseEther("1"),
          });
          const user3BalAfter = await balloonsContract.balanceOf(user2.address);
          
          expect(user2BalAfter).to.greaterThan(user3BalAfter);
        });
        it ("Should emit an event when ethToToken() called", async function () {
          await expect(dexContract.ethToToken({value: ethers.utils.parseEther("1"),})).to.emit(dexContract, "EthToTokenSwap");
        });
        it ("Should transfer tokens to purchaser after trade", async function () {
          const user3_token_before = await balloonsContract.balanceOf(user3.address);

          const tx1 = await dexContract.connect(user3).ethToToken({
            value: ethers.utils.parseEther("1"),
          });
          const tx1_receipt = await tx1.wait();
          const token_received = getEventValue(tx1_receipt, 3);

          const user3_token_after = await balloonsContract.balanceOf(user3.address);

          expect(user3_token_after, "Check if you take into account fee for the LP providers").
            to.be.equal("346747803062622811");
          expect(token_received, "Compares event from transaction to token in the user balance").
            to.equal(user3_token_after.sub(user3_token_before));
          
        });
        // could insert more tests to show the declining price, and what happens when the pool becomes very imbalanced.
      });
      describe("tokenToEth", async () => {
        it("Should send 1 $BAL to DEX in exchange for _ $ETH", async function () {
          const balloons_bal_start = await balloonsContract.balanceOf(dexContract.address);
          const dex_eth_start = await ethers.provider.getBalance(dexContract.address);

          const tx1 = await dexContract.tokenToEth(ethers.utils.parseEther("1"));
          await expect(tx1).not.to.be.revertedWith("Contract not initialized");
          // Checks that the balance of the DEX contract has decreased by 1 $BAL
          expect(await balloonsContract.balanceOf(dexContract.address)).to.equal(balloons_bal_start.add(ethers.utils.parseEther("1")));
          // Checks that the balance of the DEX contract has increased
          expect(await ethers.provider.getBalance(dexContract.address)).to.lessThan(dex_eth_start); 
        });

        it("Should revert if 0 tokens sent to the DEX", async function () {
          await expect(dexContract.tokenToEth(ethers.utils.parseEther("0"))).to.be.reverted;
        });

        it("Should emit event TokenToEthSwap when tokenToEth() called", async function () {
          await expect(dexContract.tokenToEth(ethers.utils.parseEther("1"))).to.emit(dexContract, "TokenToEthSwap");
        }); 

        it("Should send less eth after the first trade (tokenToEth() called)", async function () {
          const tx1 = await dexContract.tokenToEth(ethers.utils.parseEther("1"));
          const tx1_receipt = await tx1.wait();

          const tx2 = await dexContract.tokenToEth(ethers.utils.parseEther("1"));
          const tx2_receipt = await tx2.wait();

          const ethSent_1 =  getEventValue(tx1_receipt, 2);
          const ethSent_2 =  getEventValue(tx2_receipt, 2);
          expect(
            ethSent_2, 
            "You will get this error if your TokenToEthSwap event has ETH emited in the wrong order"
            ).below(ethSent_1);
        });
      });

      describe("Testing deposit and withdraw functionality" , async () => {
        
        describe("deposit", async () => {
          deployNewInstance();
          it("Shoud increase liquidity in the pool when ETH is deposited", async function () {
            await balloonsContract.connect(user2).approve(dexContract.address, ethers.utils.parseEther("100"));
            const liquidity_start = await dexContract.totalLiquidity();
            expect(await await dexContract.getLiquidity(user2.address)).to.equal("0");

            await expect(
              dexContract.connect(user2).deposit(( 
                ethers.utils.parseEther("5"),
                { value: ethers.utils.parseEther("5"), }
              )),
                "This error most likely come up if the order of emited events is different from the expected test: address, _tokenAmount, _ethAmount, _liquidityMinted "
              ).to.emit(dexContract, "LiquidityProvided").
                  withArgs(
                    anyValue,
                    anyValue,
                    ethers.utils.parseEther("5"),
                    ethers.utils.parseEther("5")
                  );
            const liquidity_end = await dexContract.totalLiquidity();
            expect(liquidity_end, "Total liquidity should increase").
              to.equal(liquidity_start.add(ethers.utils.parseEther("5")));
            user_lp = await dexContract.getLiquidity(user2.address);
            expect(user_lp.toString(), "User LP should be 5").to.equal(ethers.utils.parseEther("5"));
          });

          it("Should revert if 0 ETH sent", async function () {
            await expect(
              dexContract.deposit(
                (ethers.utils.parseEther("0"),
                  {
                    value: ethers.utils.parseEther("0"),
                  }
                )
              )
            ).to.be.reverted;
          });
        });
        // pool should have 5:5 ETH:$BAL ratio
        describe("withdraw", async () => {
          deployNewInstance();
          it("Should withdraw 1 ETH and 1 $BAL when pool at 1:1 ratio", async function () {
            const totalLP = await dexContract.totalLiquidity();
            console.log("dexContract.totalLiquidity", totalLP.toString());
            const tx1 = await dexContract.withdraw(ethers.utils.parseEther("1"));
            const tx1_receipt = await tx1.wait();
            const eth_out = getEventValue(tx1_receipt, 2);
            const token_out = getEventValue(tx1_receipt, 3);

            expect(eth_out, "checks the event emtier from tx").to.be
            console.log("eth_out ", eth_out.toString());

            // TODO: SYNTAX - Write expect() assessing changed liquidty within the pool. Should have an emitted event!
          });
        });
      });

      describe ("Test price() function", async () => {
        describe ("price()", async () => {
          it ("Should check if prcie function calculates correctly", async function () {
            // TODO: Check inputs with Uniswap oficial contract
            let xInput = ethers.utils.parseEther("1");
            let xReserves = ethers.utils.parseEther("5");
            let yReserves = ethers.utils.parseEther("5");

            let yOutput = await dexContract.price(xInput, xReserves, yReserves);
            // console.log("yOutput ", yOutput.toString());
            expect(yOutput.toString()).to.equal("831248957812239453");
          });
        });
      });

    });
  });
});
