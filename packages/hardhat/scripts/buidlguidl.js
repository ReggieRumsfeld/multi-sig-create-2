require("dotenv").config()
const ethers = require("ethers");

module.exports = async function () {
    //console.log("Provider: ", process.env.PROVIDER);
    const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
    //console.log("Block: ", await provider.getBlock());
    return provider.resolveName("buidlguidl.eth");
}





