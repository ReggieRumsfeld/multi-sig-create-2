const { ethers, deployments } = require("hardhat");
const { use, expect, assert } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

const coder = ethers.utils.defaultAbiCoder;
const buidlguidl = require("../scripts/buidlguidl");
const { getPreHash, getHashToSign } = require("../scripts/lib.js");



describe("Create2 MultiSig Clone", function () {
  let pk0 =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  let pk1 =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  let pk2 =
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
  let key;
  let key1;
  let key2;
  let factory;
  let implem;
  let beacon;
  let clone;
  let cloneWrong;
  let accounts;
  let bananas;
  let apes;

    before(async function () {
    accounts = await ethers.getSigners();
    await deployments.fixture(['Beacon', 'Factory', 'Implementation', 'Bananas', 'Apes']);
        beacon = await ethers.getContract("Beacon", accounts[0]);
        factory = await ethers.getContract("MultiSigFactory", accounts[0]);
        implem = await ethers.getContract("MetaMultiSigWallet", accounts[0]);
        bananas = await ethers.getContract("Bananas", accounts[0]);
        apes = await ethers.getContract("ApesNFT", accounts[0]);
    });
    
  it("Beacon initiated correctly", async function () {
    assert.equal(
      await beacon.getImplementation(),
      implem.address,
      "Not the expected address"
    );
    assert.equal(
      await beacon.getFactory(),
      factory.address,
      "Not the expected address"
    );
  });

  describe("Address prediction, receiving assets pre-deployment, and cloning", async function () {
    let predicted;
    before(async function () {
      predicted = await factory.predictMultiSigAddress(accounts[1].address);
      assert(!(await apes.isContract(predicted)), "Should return false");
    });

    describe("Receiving Assets PRE DEPLOYMENT", function () {
      it("Receives ERC20", async function () {
        const amount = ethers.utils.parseEther("420");
        await expect(bananas.mint(predicted, amount))
          .to.emit(bananas, "Transfer")
          .withArgs(
            "0x0000000000000000000000000000000000000000",
            predicted,
            amount
          );
      });

      it("Receives NFT, unsafely", async function () {
        await expect(apes.mint(predicted, 0))
          .to.emit(apes, "Transfer")
          .withArgs("0x0000000000000000000000000000000000000000", predicted, 0);
      });

      it("Receives NFT, safely", async function () {
        assert(!(await apes.isContract(predicted)), "Should return false");
        await expect(apes.safeMint(predicted, 1))
          .to.emit(apes, "Transfer")
          .withArgs("0x0000000000000000000000000000000000000000", predicted, 1);
      });
    });

    describe("Creating a clone", function () {
      it("Successfully creates a clone at the predicted address", async function () {
        const tx = await factory
          .connect(accounts[1])
          .createDeterministicMultiSig();
        const receipt = await factory.provider.getTransactionReceipt(tx.hash);
        const bytes = receipt.logs[0].topics[1];
        const address = coder.decode(["address"], bytes)[0];
        assert.equal(predicted, address, "Wrong prediction");
        clone = await ethers.getContractAt(
          "MetaMultiSigWallet",
          address,
          accounts[1]
        );
        cloneWrong = await ethers.getContractAt("MetaMultiSigWallet", address);
      });
    });
  });

  describe("⚽️ GOALS 🥅: Initialization of the clone 2/4 multisig with buidlguidl as SR co-owner ", async function () {
    let buidlAddress;
    before(async function () {
      buidlAddress = await buidlguidl();
    });
    it("non-original initiator fails", async function () {
      console.log("buidlAddress: ", buidlAddress);
      await expect(
        cloneWrong.init(
          [
            accounts[0].address,
            accounts[1].address,
            accounts[2].address,
            buidlAddress,
          ],
          2
        )
      ).to.be.revertedWith("MSG.SENDER is not the originalInitiator!");
    });

    it("original initiator inits", async function () {
      await clone.init(
        [accounts[0].address, accounts[1].address, accounts[2].address],
        2
      );
      assert(await clone.isOwner(accounts[0].address), "Should be owner");
      assert(await clone.isOwner(accounts[1].address), "Should be owner");
      assert(await clone.isOwner(accounts[2].address), "Should be owner");
      assert(
        (await clone.signaturesRequired()).eq("2"),
        "not the expected amount of required signatures"
      );
    });

    it("Can't init implem logic", async function () {
      await expect(
        implem.init(
          [accounts[0].address, accounts[1].address, accounts[2].address],
          2
        )
      ).to.be.revertedWith("MSG.SENDER is not the originalInitiator!");
    });
  });

  describe("Funding Wallet", function () {
    it("funds wallet", async function () {
      const value = ethers.utils.parseEther("1.0");
      await expect(
        accounts[0].sendTransaction({
          to: clone.address,
          value: value,
        })
      )
        .to.emit(clone, "Deposit")
        .withArgs(accounts[0].address, value, value);
    });
  });

  describe("Execute transactions via multiSig", function () {
    let offHash;
    let nonce;
    let chainId;

    before(async function () {
      key = new ethers.utils.SigningKey(pk0);
      key1 = new ethers.utils.SigningKey(pk1);
      key2 = new ethers.utils.SigningKey(pk2);
    });

    describe("Hash and Sign", function () {
      it("Getting the prehash right", async function () {
        nonce = await clone.nonce();
        chainId = await clone.chainId();
        const preHash = await clone.getTransactionHash(
          nonce,
          accounts[1].address,
          ethers.utils.parseEther("0.5"),
          0
        );
        offHash = getPreHash(
          clone.address,
          chainId,
          nonce,
          accounts[1].address,
          ethers.utils.parseEther("0.5"),
          0
        );
        assert.equal(preHash, offHash, "Hash calc should be equal");
      });
      it("Recovers Signer correctly", async function () {
        /*
            const hashToSign = ethers.utils.solidityKeccak256(
              ["string", "bytes32"],
              ["\x19Ethereum Signed Message:\n32", offHash]
            );*/
        const hashToSign = getHashToSign(offHash);
        const signature = key.signDigest(hashToSign);
        assert.equal(
          await clone.recover(offHash, signature.compact),
          accounts[0].address,
          "Not the expected address"
        );
      });
    });

    describe("Execute transfers", function () {
      let interface;
      let amount;
      let data;
      let preHash;
      let hashToSign;
      let signature0;
      let signature1;
      it("Signers0, 1, 2 are owners", async function () {
        assert(await clone.isOwner(accounts[0].address), "Should be owner");
        assert(await clone.isOwner(accounts[1].address), "Should be owner");
        assert(await clone.isOwner(accounts[2].address), "Should be owner");
      });
      it("Preps data to transfer Banana - Signer0)", async function () {
        interface = bananas.interface;
        amount = ethers.utils.parseEther("77");
        data = interface.encodeFunctionData("transfer", [
          accounts[1].address,
          amount,
        ]);
        preHash = getPreHash(
          clone.address,
          chainId,
          nonce,
          bananas.address,
          0,
          data
        );
        fromChain = await clone.getTransactionHash(
          nonce,
          bananas.address,
          0,
          data
        );
        assert.equal(preHash, fromChain, "Hashes should be equal");
        hashToSign = getHashToSign(preHash);
        signature0 = key.signDigest(hashToSign);
        assert.equal(
          await clone.recover(preHash, signature0.compact),
          accounts[0].address,
          "Not the expected address"
        );
      });
      it("Preps data to transfer Banana - Signer1/2)", async function () {
        signature1 = key1.signDigest(hashToSign);
        assert.equal(
          await clone.recover(preHash, signature1.compact),
          accounts[1].address,
          "Not the expected address"
        );
        signature2 = key2.signDigest(hashToSign);
        assert.equal(
          await clone.recover(preHash, signature2.compact),
          accounts[2].address,
          "Not the expected address"
        );
      });

      it("Transfers banana", async function () {
        const signer1Balance = await bananas.balanceOf(accounts[1].address);
        const walletBalance = await bananas.balanceOf(clone.address);
        assert(accounts[1].address > accounts[2].address);
        await clone.executeTransaction(bananas.address, 0, data, [
          signature2.compact,
          signature1.compact,
        ]);
        assert(
          (await bananas.balanceOf(accounts[1].address)).eq(
            signer1Balance.add(amount)
          ),
          "Not the expected balance of recipient"
        );
        assert(
          (await bananas.balanceOf(clone.address)).eq(
            walletBalance.sub(amount)
          ),
          "Not the expected balance of wallet"
        );
      });
    });

    describe("Transactions to admin multisig", function () {
      let interface;
      let chainId;
      before(async function () {
        interface = implem.interface;
        chainId = await clone.chainId();
      });
      it("adds owner", async function () {
        const data = interface.encodeFunctionData("addSigner", [
          accounts[3].address,
          await clone.signaturesRequired(),
        ]);
        const nonce = await clone.nonce();
        preHash = getPreHash(
          clone.address,
          chainId,
          nonce,
          clone.address,
          0,
          data
        );
        const hashToSign = getHashToSign(preHash);
        const signature0 = key.signDigest(hashToSign);
        const signature1 = key1.signDigest(hashToSign);
        await clone.executeTransaction(clone.address, 0, data, [
          signature1.compact,
          signature0.compact,
        ]);
        assert(await clone.isOwner(accounts[3].address), "Should be owner");
      });
      it("removes owner", async function () {
        const data = interface.encodeFunctionData("removeSigner", [
          accounts[0].address,
          await clone.signaturesRequired(),
        ]);
        const nonce = await clone.nonce();
        preHash = getPreHash(
          clone.address,
          chainId,
          nonce,
          clone.address,
          0,
          data
        );
        const hashToSign = getHashToSign(preHash);
        const signature0 = key.signDigest(hashToSign);
        const signature1 = key1.signDigest(hashToSign);
        await clone.executeTransaction(clone.address, 0, data, [
          signature1.compact,
          signature0.compact,
        ]);
        assert(
          !(await clone.isOwner(accounts[0].address)),
          "Should not be owner"
        );
      });
    });
  });
  describe("⚽️ GOALS 🥅: Proposing a transaction and voting", function () {
    let data;
    let preHash;
    let nonce;
    let chainId;
    let hashToSign;
    before(async function () {
      nonce = await clone.nonce();
      chainId = await clone.chainId();
    });
    it("Submits Signature", async function () {
      interface = bananas.interface;
      amount = ethers.utils.parseEther("77");
      data = interface.encodeFunctionData("transfer", [
        accounts[7].address,
        amount,
      ]);
      preHash = getPreHash(
        clone.address,
        chainId,
        nonce,
        bananas.address,
        0,
        data
      );
      const getHash = await clone.getTransactionHash(
        nonce,
        bananas.address,
        0,
        data
      );
      assert.equal(preHash, getHash, "Hashes should be equal");
      hashToSign = getHashToSign(preHash);
      const signature1 = key1.signDigest(hashToSign);
      await expect(
        clone.submitSig(bananas.address, 0, data, signature1.compact)
      ).to.emit(clone, "SubmitSig");
      //.withArgs(nonce, preHash, accounts[1].address, data)
    });
  });
});
