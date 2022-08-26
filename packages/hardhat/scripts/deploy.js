/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const chalk = require("chalk");
const { config, ethers, tenderly, run } = require("hardhat");
const { utils } = require("ethers");
const R = require("ramda");

/*

 _______ _________ _______  _______
(  ____ \\__   __/(  ___  )(  ____ )
| (    \/   ) (   | (   ) || (    )|
| (_____    | |   | |   | || (____)|
(_____  )   | |   | |   | ||  _____)
      ) |   | |   | |   | || (
/\____) |   | |   | (___) || )
\_______)   )_(   (_______)|/

This deploy script is no longer in use, but is left for reference purposes!

scaffold-eth now uses hardhat-deploy to manage deployments, see the /deploy folder
And learn more here: https://www.npmjs.com/package/hardhat-deploy

*/

const main = async () => {
   const Factory = await ethers.getContractFactory("Factory");
   const factory = await Factory.deploy();
   await factory.deployed();
   console.log("Factory deployed @ ", factory.address);

   const Beacon = await ethers.getContractFactory("Beacon");
   const beacon = await Beacon.deploy(factory.address);
   await beacon.deployed();
   console.log("Beacon Deployed @ ", beacon.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
