const { expect, assert } = require("chai");
const { network, ethers } = require("hardhat");
const coder = ethers.utils.defaultAbiCoder;
const { getPreHash, getHashToSign } = require("../scripts/lib.js");


const cloneAddress = "0x2586cfe2070559e65cbc5bc42b422326dc7aca13";
const bananaAddress = "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9";
const pk0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const pk1 =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const key = new ethers.utils.SigningKey(pk0);
const key1 = new ethers.utils.SigningKey(pk1);

describe("Submit and catch sigs to execute", function () {
    let nonce;
    let accounts;
    let clone;
    let preHash; 
    let bananas;
    let data;
    let submissionTx;
    before(async function () {
      accounts = await ethers.getSigners();
         await deployments.fixture([
           "Beacon",
           "Factory",
           "Implementation",
           "Bananas",
           "Apes",
         ]);
         beacon = await ethers.getContract("Beacon", accounts[0]);
         factory = await ethers.getContract("MultiSigFactory", accounts[0]);
         implem = await ethers.getContract("MetaMultiSigWallet", accounts[0]);
         bananas = await ethers.getContract("Bananas", accounts[0]);
         apes = await ethers.getContract("ApesNFT", accounts[0]);
/*
        bananas = await hre.ethers.getContractAt(
            "Bananas",
            bananaAddress,
            accounts[0]
        );*/
        clone = await ethers.getContractAt(
          "MetaMultiSigWallet",
          cloneAddress,
          accounts[1]
      ); 
      

          const interface = bananas.interface;
          //const amount = ethers.utils.parseEther("77");
            
          data = interface.encodeFunctionData("transfer", [
            accounts[1].address,
            77,
          ]);
    })
    
  describe("Clone creation, initiation and funding", function () {
     it("Successfully creates a clone at the predicted address", async function () {
       const tx = await factory
         .connect(accounts[1])
         .createDeterministicMultiSig();
       const receipt = await factory.provider.getTransactionReceipt(tx.hash);
       const bytes = receipt.logs[0].topics[1];
       const address = coder.decode(["address"], bytes)[0];
       assert.equal(cloneAddress, address.toLowerCase(), "Wrong prediction");
       clone = await ethers.getContractAt(
         "MetaMultiSigWallet",
         address,
         accounts[1]
       );
     });
    it("initialize", async function () {
        await clone.init(
          [accounts[0].address, accounts[1].address, accounts[2].address],
          2
        );
      assert(await clone.isOwner(accounts[0].address), "Should be owner");
      assert(await clone.isOwner(accounts[1].address), "Should be owner");
      assert(
        (await clone.signaturesRequired()).eq("2"),
        "not the expected amount of required signatures"
      );
    })
    it("fund Clone with balances", async function () {
      const amount = ethers.utils.parseEther("420");
      await bananas.mint(clone.address, amount);
      assert((await bananas.balanceOf(clone.address)).eq(amount));
    })
  })
  
    describe("SubmitSig event", function () {
    
        it("Sets up preHash", async function () {
            const chainId = await clone.chainId();
            nonce = await clone.nonce();
            preHash = getPreHash(
                clone.address, chainId, nonce, bananas.address, 0, data
            )
            const getHash = await clone.getTransactionHash(nonce, bananas.address, 0, data);
            assert.equal(preHash, getHash, "Hashes should be equal");
        })
        // Checking Data validity
        /*
        it("Sign and submit", async function () {
            const hashToSign = getHashToSign(preHash);
            const signature1 = key.signDigest(hashToSign);
            const signature2 = key1.signDigest(hashToSign);
            await clone.executeTransaction(bananas.address, 0, data, [signature2.compact, signature1.compact]);
        }) */
        it("SubmitSig", async function () {
                const hashToSign = getHashToSign(preHash);
            const signature = key.signDigest(hashToSign);
                expect(
                  submissionTx = await clone.submitSig(bananas.address, 0, data, signature.compact)
                )
                  .to.emit(clone, "SubmitSig")
                  .withArgs(
                    nonce,
                    preHash,
                    accounts[0].address,
                    signature.compact
            );   
        })
    });
    describe("Catch and use event", function () {
        let sigMap;
        let preHash;
        let sigArray;
        let hashFromMap;
        it("Maps logs", async function () {
            const filter = clone.filters.SubmitSig(nonce, null, null);
            const logs = await clone.provider.getLogs(filter);
           // console.log(logs)
            sigMap = new Map()
             logs.forEach(element => {
            preHash = element.topics[2];
            const signature = coder.decode(["bytes"], element.data)[0]
            const signer = coder.decode(["address"], element.topics[3])
                 const txHash = element.transactionHash;
                 console.log(txHash);
            const object = {
                signer: signer,
                signature: signature,
                txHash: txHash
            }
            let array;
            if (sigMap.get(preHash)) {
                array = sigMap.get(preHash);
                if (array.filter(element => element.signer == signer)) return;
                const index = array.findIndex(element.signer > signer);
                if (!index) array.push(object)
                else array.splice(index, object)
                
            } else {
                array = [object]
            } 
                 sigMap.set(preHash, array);
            assert.equal(sigMap.get(preHash)[0].txHash, submissionTx.hash)     
        })
        })
        it("Get's hash to Sign and asserts it in array", async function () {
            const iterator = sigMap.keys();
            hashFromMap = iterator.next().value;
            assert.equal(preHash, hashFromMap, "Hashes should be equal");
            const hashToSign = getHashToSign(preHash);
            const pk1 =
              "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
            const key1 = new ethers.utils.SigningKey(pk1);
            const signature = key1.signDigest(hashToSign).compact;
            console.log("Signature: ", signature);
            const objectArray = sigMap.get(preHash);
            const dbSignerLarger = (element) =>
              element.signer > accounts[1].address;
            const index = objectArray.findIndex(dbSignerLarger);
            console.log("Index: ", index)
            sigArray = [];
            objectArray.forEach((element) => sigArray.push(element.signature));
            if (index < 0) sigArray.push(signature);
            else sigArray.splice(index, 0, signature);
            console.log("SigArray: ", sigArray)
        })
        it("Get execution Data from map and execute", async function () {
                const txHash = sigMap.get(hashFromMap)[0].txHash;
                const transaction = await clone.provider.getTransaction(txHash);
          const txData = "0x" + transaction.data.slice(10);
          const decoded = coder.decode(
            ["address", "uint", "bytes", "bytes"],
            txData
          );
          const to = decoded[0];
          const value = decoded[1];
            const dataRetrieved = decoded[2];
            assert.equal(data, dataRetrieved)
          console.log(sigArray);
            await clone.executeTransaction(to, value, data, sigArray);
            await bananas.mint(clone.address, 77);
        })
    })
})

