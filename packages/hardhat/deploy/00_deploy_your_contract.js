/* eslint-disable prettier/prettier */
// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");

const localChainId = "31337";
let initTxReceipt;

// const sleep = (ms) =>
//   new Promise((r) =>
//     setTimeout(() => {
//       console.log(`waited for ${(ms / 1000).toFixed(3)} seconds`);
//       r();
//     }, ms)
//   );

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log, execute } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  await deploy("Balloons", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    // args: [ "Hello", ethers.utils.parseEther("1.5") ],
    log: true,
  });

  const balloons = await ethers.getContract("Balloons", deployer);

  await deploy("DEX", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [balloons.address],
    log: true,
    waitConfirmations: 5,
  });

  const dex = await ethers.getContract("DEX", deployer);

  // paste in your front-end address here to get 10 balloons on deploy:
  await balloons.transfer(
    "0xf41123669f91b482626b198bd72f2A1E6E62fB5a",
    "" + 10 * 10 ** 18
  );

  // uncomment to init DEX on deploy:
  console.log(
    "Approving DEX (" + dex.address + ") to take Balloons from main account..."
  );
  // If you are going to the testnet make sure your deployer account has enough ETH
  await balloons.approve(dex.address, ethers.utils.parseEther("100"));
  console.log("INIT exchange...");
  
  await dex.init(ethers.utils.parseEther("5"), {
    // transfer 5 balloons to DEX
    value: ethers.utils.parseEther("5"),
    // transfer 5 ETH to DEX
    gasLimit: 200000,
  });
  // initTxReceipt = await initTx.wait();

  // await execute(
  //   "DEX", 
  //   { from: deployer, 
  //     log: true,
  //     value: ethers.utils.parseEther("5"),
  //     gasLimit: 200000,
  //   },
  //   "init", 
  //   ethers.utils.parseEther("5")
  // ).then((res) => {
  //   res.events.forEach((e) => {
  //     log("INIT events are",e.event, e.args);
  //   });
  // TODO: find out how to pass the receipt to the testing file so we can test the events emitted by the init function in the DEX contract 
  // });
};
module.exports.tags = ["Balloons", "DEX"];
module.exports.log = true; 
