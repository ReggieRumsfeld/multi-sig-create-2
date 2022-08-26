//const { ethers } = require("hardhat");
//const { assert, expect } = require("chai");

// const sleep = (ms) =>
//   new Promise((r) =>
//     setTimeout(() => {
//       console.log(`waited for ${(ms / 1000).toFixed(3)} seconds`);
//       r();
//     }, ms)
//   );
/**
 * Hardhat-deploy plugin: https://www.npmjs.com/package/hardhat-deploy
 * Extends the HRE with the following fields:
 * @param getNamedAccounts parsed from namedAccounts config
 * @param getUnnamedAccounts useful for test where you want to be sure that the account is not one of the predefined one
 * @param deployments contains functions to access past deployments or to save new ones, as well as helpers functions.
 * @param getChainId fetch current chainId
 */
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("Bananas", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    //args: [beacon.address],
    log: true,
    waitConfirmations: 5,
  });
};
module.exports.tags = ["Bananas"];
