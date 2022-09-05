import { Button, Card, DatePicker, Divider, Input, Progress, Slider, Spin, Switch, Tag, message, List, Image} from "antd";
import React, { useState } from "react";
import { utils } from "ethers";
import { SyncOutlined, CheckCircleOutlined, DeleteOutlined, FacebookFilled } from "@ant-design/icons";
import { Address, Balance, Events } from "../components";
import { useEffect } from "react";
import { ethers } from "ethers";
import walletPic from "../multi_image.jpeg"

const cloneInterface = new ethers.utils.Interface([
    "function initialized() public view returns (bool _init)",
    "function nonce() public view returns (uint)",
    "function signaturesRequired() returns (uint)",
    "function getTransactionHash(uint256 _nonce, address to, uint256 value, bytes memory data) public view returns (bytes32)",
    "function recover(bytes32 _hash, bytes memory _signature) public pure returns (address)",
    "function init(address[] memory _owners, uint _signaturesRequired)",
    "function executeTransaction(address payable to, uint256 value, bytes memory data, bytes[] memory signatures)",
    " function submitSig(address to, uint value, bytes calldata data, bytes calldata signature)",
    "event Deposit(address indexed sender, uint amount, uint balance)",
    "event ExecuteTransaction(uint256 indexed nonce, address indexed owner, address payable to, uint256 value, bytes data,  bytes32 hash, bytes result)",
    "event Owner(address indexed owner, bool added)",
    "event SubmitSig(uint indexed nonce, bytes32 indexed txHash, address indexed signer, bytes data)"
  ]);

const IERC20Interface = new ethers.utils.Interface([
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
])

const IERC721Interface = new ethers.utils.Interface([
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)", 
  "function safeTransferFrom(address, address, uint256, bytes)",
  "function transferFrom(address, address, uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
])

const coder = ethers.utils.defaultAbiCoder

const enterOwner = "Enter address of intended co-owner..."

 
export default function ExampleUI({
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  localWalletBalance,
  price,
  tx,
  readContracts,
  writeContracts,
  wrapperAddress,
  userSigner
}) {
  const [cloneDeployed, setCloneDeployed] = useState(false);
  const [cloneInit, setCloneInit] = useState(false);
  const [cloneAddress, setCloneAddress] = useState();
  const [cloneState, setCloneState] = useState();
  const [walletBalance, setWalletBalance] = useState(); 
  const [nonce, setNonce] = useState();
  const [submitted, setSubmitted] = useState();
  const [hashArray, setHashArray] = useState();
  const [deposit, setDeposit] = useState();
  const [transferAmount, setTransferAmount] = useState();
  const [transferAddress, setTransferAddress] = useState();
  const [owner0, setOwner0] = useState();
  const [owner1, setOwner1] = useState();
  const [owner2, setOwner2] = useState();
  const funArr = [setOwner0, setOwner1, setOwner2];
  const owners = [owner0, owner1, owner2];
  const [ERC20Balance, setERC20Balance] = useState();
  const [ERC20, setERC20] = useState();
  const [tokenAmount, setTokenAmount] = useState();
  const [ApeCount, setApeCount] = useState();
  const [NFT, setNFT] = useState();
  const [TokenID, setTokenID] = useState();
 

  //const walletBalance = useBalance(localProvider, cloneAddress);

  let pk0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  let key = new ethers.utils.SigningKey(pk0);


  //////////////////////
  /// INPUT HANDLERS ///
  //////////////////////

  const handleChange = (index) => (event) => {
    const input = event.target.value;
    console.log("Input: ", input);
    const isAddress = utils.isAddress(input);
    if (isAddress) {
      if (owners.find(element => element == input)) return message.warning("Owners need to be unique")
      funArr[index](input);
    }
   };

   const updateAddress = async(newValue) => {
    //console.log(" Updating adddress ")
    if (typeof newValue !== "undefined"  && utils.isAddress(newValue)) {
      if(newValue == wrapperAddress) return setCloneAddress(newValue);
      const clone = new ethers.Contract(newValue, cloneInterface, userSigner);
      // Replace next two lines with hasCode()
      const code = await localProvider.getCode(newValue)
      if(code.length == 2) return // no code deployed at address 
      let init;
      try { init = await clone.initialized } catch (error) {
        return  // not a multisig (at least not of our kind)
      }
      if(!init) return // not init
      setCloneAddress(newValue);
    }
  };


  const updateERC20 = async(newValue) => {
    /*
    if (typeof newValue !== "undefined"  && utils.isAddress(newValue)) {
      if(!(await hasCode(newValue))) return */
      const validContract = await validAndCode(newValue);
      if(!validContract) return message.warning("Not a Contract")

      const erc20 = new ethers.Contract(newValue, IERC20Interface, userSigner);
      try { 
        const balance = await erc20.balanceOf(cloneAddress) 
        setERC20Balance(balance.toString())
        setERC20(erc20)
      } catch (error) {
        return message.warning("Not an IERC20 Contract")
      }
    }
  

  const updateNFT = async(newValue) => {
    const validContract = await validAndCode(newValue);
    if(!validContract) return message.warning("Not a Contract")
    const erc721 = new ethers.Contract(newValue, IERC721Interface, userSigner);
    try {
      await erc721.balanceOf(cloneAddress)
      setNFT(erc721);
    } catch (error) {
      return message.warning("Not an IERC721 Contract");   
    }

  }

   ///////////////////
   //// EXECUTION ////
   /////////////////// 

  
   /// Actually signing and triggerin submitSig event onchain
   async function executeTransfer() {
    if(!ethers.utils.isAddress(transferAddress)) return message.warning("Not a valid address")
    const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
    const nonce = await clone.nonce();
    console.log(" Nonce: ", nonce);
    const amount = ethers.utils.parseEther(transferAmount);
    console.log("Amount to be transferred: ", amount)
    const preHash = await clone.getTransactionHash(
      nonce,
      transferAddress,
      amount,
      0
    )
    if(hashArray.includes(preHash)) return message.warning("Hash already included in Suggested Tx")
    const signature = await userSigner.signMessage(ethers.utils.arrayify(preHash))
    const signer = await clone.recover(preHash, signature)
    
    if (
      //signer != userSigner.address // !!!!!!!!!!! this was fine on local host, but the userSigner object is diff
      signer != address
    ) return message.warning("Issue with the signature, couldn't recover userSigner")
    const result = tx(clone.submitSig(transferAddress, amount, 0, signature), update => {
        console.log("📡 Transaction Update:", update);
        if (update && (update.status === "confirmed" || update.status === 1)) {
          //
          // Do we need it to update?????
          // setCloneDeployed(true)
          // getLogs()
          //
          console.log(" 🍾 Transaction " + update.hash + " finished!");
          console.log(
            " ⛽️ " +
              update.gasUsed +
              "/" +
              (update.gasLimit || update.gas) +
              " @ " +
              parseFloat(update.gasPrice) / 1000000000 +
              " gwei",
          );
        }
      });
      console.log("awaiting metamask/web3 confirm result...", result);
      console.log(await result);
}

async function transferERC20() {
  // Do this check at one location at the moment of setting
  if(!ethers.utils.isAddress(transferAddress)) return message.warning("Not a valid address")
  const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
  const nonce = await clone.nonce();
  const data = IERC20Interface.encodeFunctionData("transfer", [transferAddress, tokenAmount])
  const preHash = await clone.getTransactionHash(
    nonce,
    ERC20.address,
    0,
    data  
  )
  if(hashArray.includes(preHash)) return message.warning("Hash already included in Suggested Tx")
  const signature = await userSigner.signMessage(ethers.utils.arrayify(preHash))
  const signer = await clone.recover(preHash, signature)
  if (
    //signer != userSigner.address
    signer != address
  ) return message.warning("Issue with the signature, couldn't recover userSigner")
  const result = tx(clone.submitSig(ERC20.address, 0, data, signature), update => {
    console.log("📡 Transaction Update:", update);
    if (update && (update.status === "confirmed" || update.status === 1)) {
      
      console.log(" 🍾 Transaction " + update.hash + " finished!");
      console.log(
        " ⛽️ " +
          update.gasUsed +
          "/" +
          (update.gasLimit || update.gas) +
          " @ " +
          parseFloat(update.gasPrice) / 1000000000 +
          " gwei",
      );
    }
  });
  console.log("awaiting metamask/web3 confirm result...", result);
  console.log(await result);
  // The actual transaction
}

async function transferNFT() {
   // Do this check at one location at the moment of setting
   if(!ethers.utils.isAddress(transferAddress)) return message.warning("Not a valid address")
   const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
   const nonce = await clone.nonce();
   const data = IERC721Interface.encodeFunctionData("transferFrom", [cloneAddress, transferAddress, TokenID])
   const preHash = await clone.getTransactionHash(
    nonce,
    NFT.address,
    0,
    data  
  )
  if(hashArray.includes(preHash)) return message.warning("Hash already included in Suggested Tx")
  const signature = await userSigner.signMessage(ethers.utils.arrayify(preHash))
  const signer = await clone.recover(preHash, signature)
  if (
    //signer != userSigner.address
    signer != address
  ) return message.warning("Issue with the signature, couldn't recover userSigner")
  const result = tx(clone.submitSig(NFT.address, 0, data, signature), update => {
    console.log("📡 Transaction Update:", update);
    if (update && (update.status === "confirmed" || update.status === 1)) {
      console.log(" 🍾 Transaction " + update.hash + " finished!");
      console.log(
        " ⛽️ " +
          update.gasUsed +
          "/" +
          (update.gasLimit || update.gas) +
          " @ " +
          parseFloat(update.gasPrice) / 1000000000 +
          " gwei",
      );
    }
  });
  console.log("awaiting metamask/web3 confirm result...", result);
  console.log(await result);


}


async function signAndExecute(ogSigner, ogSignature, preHash, txHash) {
  let sigArray;
  //const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
  const signature = await userSigner.signMessage(ethers.utils.arrayify(preHash))
  message.warning("Signature is fine")
  console.log("Signature: ", signature);
  console.log("OgSignature: ", ogSignature);
  console.log("Sig Array: ", ogSigner)
  if(address > ogSigner) {
    sigArray = [ogSignature, signature]
  } else {
    sigArray = [signature, ogSignature]
  }
  const transaction = await localProvider.getTransaction(txHash)
  const txData = "0x" + transaction.data.slice(10);
  const decoded = coder.decode(
    ["address", "uint", "bytes", "bytes"],
    txData
  );
  const to = decoded[0];
  const value = decoded[1];
    const data = decoded[2];
    const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
    console.log("Signatures required: ", await clone.signaturesRequired())
    const result = tx(clone.executeTransaction(to, value, data, sigArray), update => {
      console.log("📡 Transaction Update:", update);
      if (update && (update.status === "confirmed" || update.status === 1)) {
        
        console.log(" 🍾 Transaction " + update.hash + " finished!");
        console.log(
          " ⛽️ " +
            update.gasUsed +
            "/" +
            (update.gasLimit || update.gas) +
            " @ " +
            parseFloat(update.gasPrice) / 1000000000 +
            " gwei",
        );
      }
    });
}


   ///////////////////
   /// LOGS - LOGS ///
   ///////////////////

   function handleEvents(events) {
    setSubmitted(events)
    let preHashArray = [];
    for(let i=0; i < events.length; i++) {
     preHashArray.push(events[i].args.txHash);
    }
    console.log("PrehashArray after loop: ", preHashArray)
    setHashArray(preHashArray)
   }

   async function getLogs() {
    //const clone = new ethers.Contract(wrapperAddress, cloneInterface, userSigner);
    const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
    console.log("Nonce: ", nonce)
    const events = await clone.queryFilter(clone.filters.SubmitSig(nonce))
    console.log("queryfilter: ", events )
    handleEvents(events)
    //
    console.log("Submitted: ", submitted)
  }

  async function resetNonce(nonce, clone) {
    const currentNonce = await clone.nonce()
    if(currentNonce > nonce) {
      setNonce(currentNonce);
    }
  }

  async function subscribeLogs() {
    //const clone = new ethers.Contract(wrapperAddress, cloneInterface, userSigner);
    const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
    console.log('Subscription triggered')
    clone.on(clone.filters.SubmitSig(nonce), () => {
      console.log("Event received");
      getLogs()
    })
    // Reset Nonce: as alternative to do it actively 
    clone.once(clone.filters.ExecuteTransaction(nonce), () => {
      //console.log('Execution event received: ', event.transactionHash)
      message.warning("An execution event was emitted with Nonce: " + nonce)
      resetNonce(nonce, clone)
    })
  }


  async function subscribeERC20() {
    cloneState.once(ERC20.filters.Transfer(cloneAddress), () => {
      resetNonce(nonce, cloneState)
    })
  }

  async function subscribeNFT() {
    cloneState.once(NFT.filters.Transfer(cloneAddress), (event) => {
      resetNonce(nonce, cloneState)
    })
  }

  /////////////
  // HELPERS //
  /////////////

  async function validAndCode(address) {
    if(!validAddress(address)) return false;
    const _hasCode = await hasCode(address);
    if(_hasCode) return true;
    return false;
  }

  function validAddress(address) {
    return (typeof address !== "undefined" && utils.isAddress(address))
  }

  async function hasCode(address) {
    const code = await localProvider.getCode(address)
    if (code.length > 2) return true;
    return false;
  }

  async function getBalance() {
    setWalletBalance(await localProvider.getBalance(cloneAddress));
  }

  async function getTokenBalance() {
    setERC20Balance((await ERC20.balanceOf(cloneAddress)).toString())
  }

  /////////////
  /// HOOKS ///
  /////////////

  /**
   * If the wrapperAddress changes (initial render or changing signer)
   *  We set the cloneAddress to the Wrapper address
   */
  useEffect(() => {
    if(wrapperAddress) {
      setCloneAddress(wrapperAddress);
    }
  }, [wrapperAddress])


    /**
     *  If we have a cloneAddress which is not the wrapper,
     * We know the multiSig is deployed
     * How about the change back?
     */
  useEffect(() => {
    async function cloneSettings () {
    if(cloneAddress) { // A valid one, not the initial "undefined" state setting
      const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
      setCloneState(clone)
      if(cloneAddress != wrapperAddress) {
        // has been set to interact with...
        // from the conditions in the changehandler, it is deployed and init
        setCloneDeployed(true);
        setCloneInit(true);
        setNonce(await clone.nonce());
      } else { // cloneAddress == wrapperAddress
        const isContract = await hasCode(cloneAddress)
        setCloneDeployed(isContract);
        if(isContract) {
          setCloneInit(await clone.initialized());
          setNonce(await clone.nonce());
        }
       
      }
      // ERC20 Addition
      if(ERC20) {
        updateERC20()
      }
    }
    }
    cloneSettings()
  } , [cloneAddress])

/**
 * To trigger the Init check, after a clone has been deployed through the application
 * If(cloneInit) previously; already init wrapperAddress clone or non wrapperAddress clone
 */
  useEffect(() => {    
    async function isInit() {
      if(cloneDeployed && !cloneInit && cloneState) {
        //const clone = new ethers.Contract(wrapperAddress, cloneInterface, userSigner);
        //const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
        const clone = cloneState
        if(await clone.initialized()) setCloneInit(true);
        setNonce(await clone.nonce());
      }
    }
    isInit()
    }, [cloneDeployed])

    useEffect(() => {
      // only cloneDeployed initially
      if(cloneDeployed && nonce) {
       getLogs();
     }
    }, [nonce])

    
    useEffect(() => {
      if(nonce) {
       subscribeLogs();
      }
    },[nonce, cloneAddress]) 

    useEffect(() => {
      if(ERC20) {
        subscribeERC20();
      }
    }, [ERC20])

    useEffect(() => {
      if(NFT) {
        subscribeNFT();
      }
    }, [NFT])


    /**
     * Balance on every render? 
     */
    useEffect(() => {
      if(cloneAddress) {
        getBalance(); 
        //setWalletBalance(balance);
      }
    }, [cloneAddress, nonce, cloneDeployed, deposit])

 

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ /*border: "1px solid #cccccc",*/ padding: 16, width: 800, margin: "auto", marginTop: 64 }}>
      <h1> Have a MULTI SIG </h1>

        <Image
        width={500}
        src={walletPic}
        //</div>src={"https://cdn.fstoppers.com/styles/full/s3/media/2019/12/04/nando-jpeg-quality-006-too-much.jpg"}
        >
        </Image>
        <h2>Without deploying one... if you dare!</h2>
       
        <i></i>
      
      { /**
         * //////////////
         * // ADRESSES //
         * //////////////
         */}
        <Divider />
        <h2>Create2 Clones</h2>
        
         <i>The multisig</i> FACTORY: &nbsp;
        <Address
          address={readContracts && readContracts.MultiSigFactory ? readContracts.MultiSigFactory.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />{" "}
         <i>deploys clones</i> 
         <br></br>
       <i>delegating calls to</i> WALLET LOGIC: &nbsp;
        <Address
          address={readContracts && readContracts.MetaMultiSigWallet ? readContracts.MetaMultiSigWallet.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        /> 
        <br></br> <br></br>
        <i> The deployment process involves the create2 opcode, which allows one to determine the <br></br> address before the actual deployment. </i> 
        <br></br> <br></br>
        <i>Using the hash of your </i>   
          EOA/ACCOUNT <Address address={address} ensProvider={mainnetProvider} fontSize={16} />
        <i> as salt,</i> <br></br>
        <i>the address of your wallet will be: </i>
        <br></br>
        <Address address={wrapperAddress} ensProvider={mainnetProvider} fontSize={32} />
        <br></br> <br></br>
        <h3> A wallet can only be initialized by the account/eoa from which it address is derived! </h3>
       <b>TLDR: &nbsp;</b> 
        <i>You can use this address as recipient before actually deploying the contract. </i> <br></br>
        <i>The less balsy approach however - deploying the wallet before using it - is advisable </i>
        {/**
         * /////////////////////////////////
         * //// INTERACTING WITH WALLET ////
         * /////////////////////////////////
         */}

         <Divider />
         <div style={{ margin: 8, width: 470, margin: "auto"}}>
          <h2> Interacting with Wallet(location): &nbsp;
          <Address address={cloneAddress} ensProvider={mainnetProvider} fontSize={16} />
          </h2>
          <Input type="text" allowClear 
          onChange={e => {
            updateAddress(e.target.value);
          }} 
          placeholder = {'Enter Wallet address to interact with...'}
          />
          </div>
        {/**
         * //////////////////////////////////
         * //////// DEPLOY WALLET ///////////
         * //////////////////////////////////
         */}
      
        <div style={{ margin: 8 }}>
        <Divider />
          <h2>Deploy Wallet: </h2>
          {cloneDeployed ? (
            <Tag icon={<CheckCircleOutlined />} color={"success"}>
              Wallet deployed
            </Tag>
          ) : (
            <Button
              style={{ marginTop: 8 }}
              type="primary"
              disabled={cloneDeployed}
                onClick={async () => {
                const result = tx(writeContracts.MultiSigFactory.createDeterministicMultiSig(), update => {
                  console.log("📡 Transaction Update:", update);
                  if (update && (update.status === "confirmed" || update.status === 1)) {
                    //
                    setCloneDeployed(true)
                    //
                    console.log(" 🍾 Transaction " + update.hash + " finished!");
                    console.log(
                      " ⛽️ " +
                        update.gasUsed +
                        "/" +
                        (update.gasLimit || update.gas) +
                        " @ " +
                        parseFloat(update.gasPrice) / 1000000000 +
                        " gwei",
                    );
                  }
                });
                console.log("awaiting metamask/web3 confirm result...", result);
                console.log(await result);
              }}
            >
              Deploy Wallet
            </Button>
          )}
        </div>
          {/**
           * //////////////////////////////////
           * ///////// INIT WALLET ////////////
           * //////////////////////////////////
           */}

        <div style={{ margin: 8, width: 470, margin: "auto"}}>
          {" "}
          <br></br>
          <h2>Initialize 2/3 Wallet: </h2>
          {cloneInit ? (
            <Tag icon={<CheckCircleOutlined />} color={"success"}>
              Wallet initialized
            </Tag>
          ) : (
            <div>
              <h4>Owner 1:</h4>
              <Input 
              type="text" 
              allowClear 
              onChange={handleChange(0)}
              placeholder={enterOwner} /> <br></br>
              {owner0 ? (
                <div>
                  <Address address={owner0} />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setOwner0("");
                    }}
                  ></Button>
                </div>
              ) : (
                <div></div>
              )}{" "}
              <br></br>
              <h4>Owner 2:</h4>
              <Input 
              type="text" 
              allowClear 
              onChange={handleChange(1)}
              placeholder={enterOwner} /> <br></br>
              {owner1 ? (
                <div>
                  <Address address={owner1} />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setOwner1("");
                    }}
                  ></Button>
                </div>
              ) : (
                <div></div>
              )}
              <br></br>
              <h4>Owner 3:</h4>
              <Input 
              type="text" 
              allowClear 
              onChange={handleChange(2)}
              placeholder={enterOwner}
               /> <br></br>
              {owner2 ? (
                <div>
                  <Address address={owner2} />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setOwner2("");
                    }}
                  ></Button>
                </div>
              ) : (
                <div></div>
              )}
              <br></br>
              <Button
                style={{ marginTop: 8 }}
                type="primary"
                disabled={!cloneDeployed}
                  onClick={async () => {
                    if (owners.find(element => element == null)) return message.warning("You need three individual addresses to initiate")
                    //const clone = new ethers.Contract(wrapperAddress, cloneInterface, userSigner);
                    const clone = new ethers.Contract(cloneAddress, cloneInterface, userSigner);
                    const code = await hasCode(clone.address)
                    const init = await clone.initialized()
                   
                  const result = tx(clone.init(owners, 2), update => {
                    console.log("📡 Transaction Update:", update);
                    if (update && (update.status === "confirmed" || update.status === 1)) {
                    
                      setCloneInit(true)
                      
                      console.log(" 🍾 Transaction " + update.hash + " finished!");
                      console.log(
                        " ⛽️ " +
                          update.gasUsed +
                          "/" +
                          (update.gasLimit || update.gas) +
                          " @ " +
                          parseFloat(update.gasPrice) / 1000000000 +
                          " gwei",
                      );
                    }
                  }); 
                 console.log("awaiting metamask/web3 confirm result...", result);
                  console.log(await result);
                }}
              >
                Initialize
              </Button> 
              <br></br> <br></br>
              <div>
              <h4>Social recovery option: &nbsp;
              <Address address="0x97843608a00e2bbc75ab0c1911387e002565dede" ensProvider={mainnetProvider} fontSize={16} />
              </h4>
              </div>
            </div>
          )}
        </div>
    
        {/**
         * /////////////////////////
         * ////// BALANCES /////////
         * /////////////////////////
         */}
        <Divider /> 
        <h2> Balances: </h2>
        {/* use utils.formatEther to display a BigNumber: */}
        <h4>Your Account: {yourLocalBalance ? utils.formatEther(yourLocalBalance) : "..."} ETH 
       {/* OR 
        <Balance address={address} provider={localProvider} price={price} fontSize={12} /> */} </h4>
        {/* use utils.formatEther to display a BigNumber: */}
        <h4> Wallet: &nbsp; <Address address={cloneAddress} ensProvider={mainnetProvider} fontSize={16} /> &nbsp;
         {walletBalance ? utils.formatEther(walletBalance) : "..."} ETH </h4>
        {/*
        <h4>OR</h4>
         <h2>$ {utils.formatEther(walletBalance) * price}</h2>
        */}
        {/**
         * ///////////////////
         * //// DEPOSIT //////
         * ///////////////////
         */}
       <br></br>
       <div style={{ margin: 8, width: 320, margin: "auto"}}>
       <Input type="text" allowClear
       placeholder = {'Enter ETH amount to deposit into wallet...'}
       onChange = { e => {
        setDeposit(e.target.value) }}
        /> </div>
        <br></br>
        <Button
        type="primary"
        onClick={async () => {
         const result = tx(userSigner.sendTransaction({
            to: cloneAddress,
            value: ethers.utils.parseEther(deposit)
          }), update => {
            console.log("📡 Transaction Update:", update);
            if (update && (update.status === "confirmed" || update.status === 1)) {
              getBalance()
              console.log(" 🍾 Transaction " + update.hash + " finished!");
              console.log(
                " ⛽️ " +
                  update.gasUsed +
                  "/" +
                  (update.gasLimit || update.gas) +
                  " @ " +
                  parseFloat(update.gasPrice) / 1000000000 +
                  " gwei",
              );
            }
          }); 
          console.log("awaiting metamask/web3 confirm result...", result);
          console.log(await result);
        }}> Deposit</Button> 
      {/**
       * ///////////////////
       * //// EXECUTION ////
       * ///////////////////
       */}
       <Divider />
        <h4>Tx's to be confirmed: </h4>
       {/** 
        * ////////////////////////////
        * /// GET LOGS AND EXECUTE ///
        * ////////////////////////////
        */}
       
          <List
        bordered
        dataSource={submitted}
        renderItem={item => {
          return (
            <List.Item key={item.transactionHash}>
              {<Address address={item.args.signer} ensProvider={mainnetProvider} fontSize={16} /> }
               &nbsp; Hash: {item.args.txHash.substr(0, 9)}...
              {/*item.args.data*/}
              <br></br>
              <Button
              type="primary"
              onClick={() => {
                signAndExecute(item.args.signer, item.args.data, item.args.txHash, item.transactionHash)
              }}>Execute</Button>
            </List.Item>
          );
        }}
      /> 
       { /**
        * //////////////
        * // TRANSFER //
        * //////////////
        */}
         <Divider />
         <div style={{ margin: 8, width: 470, margin: "auto"}} >
         <h2>Create a new Transaction:</h2>
       <h3>Recipient: </h3>
       <Input type="text" allowClear
       placeholder = {'Enter Transfer Address'}
       onChange = { e => {
        setTransferAddress(e.target.value) }}
        />
       <Divider />
       <h3>Transfer ETH:</h3>
       <Input type="text" allowClear
       placeholder = {'Enter value in eth...'}
       onChange = { e => {
        setTransferAmount(e.target.value) }}
        />
         <br></br> <br></br>
        <Button
         type="primary"
        disabled = {!cloneInit}
         onClick = {() => {
          executeTransfer()
        }}>Transfer ETH</Button>
        {/**
         * ////////////
         * // BANANA //
         * ////////////
         */}
         <Divider />
         <h4><i>Tokens to fool around:</i></h4>
         Bananas Address: &nbsp;
        <Address
          address={readContracts && readContracts.Bananas ? readContracts.Bananas.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />{" "}
        <br></br>
        <Button
            type="primary"
            onClick={() => {
              /* look how you call setPurpose on your contract: */
              tx(writeContracts.Bananas.mint(cloneAddress, 10), update => {
                console.log("📡 Transaction Update:", update);
                if (update && (update.status === "confirmed" || update.status === 1)) {
                  getBalance()
                  console.log(" 🍾 Transaction " + update.hash + " finished!");
                  console.log(
                    " ⛽️ " +
                      update.gasUsed +
                      "/" +
                      (update.gasLimit || update.gas) +
                      " @ " +
                      parseFloat(update.gasPrice) / 1000000000 +
                      " gwei",
                  );
                }
              });

            }}
          >
            Mint 10 🍌🍌 
          </Button>
          {/**
           * ////////////
           * // ERC20  //
           * ////////////
           */}
            <Divider /> 
        <h2> ERC20: </h2>
        Interacting with contract:
        <Input type="text" allowClear
       placeholder = {'Set contract address..'}
       onChange = { e => {
        updateERC20(e.target.value)}}
        />
        Balance: {ERC20Balance}
         <br></br> <br></br>
         <Input type="text" allowClear
       placeholder = {'Enter Token Amount'}
       onChange = { e => {
        setTokenAmount(e.target.value) }}
        />
        <br></br><br></br>
         <Button
            type="primary"
            disabled = {!cloneInit || !ERC20 || !transferAddress}
            onClick={() => {
              /* look how you call setPurpose on your contract: */
              transferERC20()
            }}
          >
            SEND {tokenAmount} 🍌🍌 
          </Button>
          {/**
           * //////////
           * // APES //
           * //////////
           */}
           <Divider />
           <h4><i>NFT's to fool around:</i></h4>
           Apes Address &nbsp;
           <Address
          address={readContracts && readContracts.ApesNFT ? readContracts.ApesNFT.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />{" "}
        <br></br>
        <Button
            type="primary"
            onClick={() => {
              async function apeCount() {
                const count = await readContracts.ApesNFT.count();
              setApeCount(count.toString())
              }
           
            apeCount()              
            }}
          >
            🙈 Count
          </Button> <br></br>
        Id to be minted: {ApeCount}
          <br></br>
  
        <Button
            type="primary"
            onClick={async () => {
             // async function mintApe() {
                const count = await readContracts.ApesNFT.count() //BigNumber
                const result = tx(writeContracts.ApesNFT.mint(cloneAddress, count), update => {
                console.log("📡 Transaction Update:", update);
                if (update && (update.status === "confirmed" || update.status === 1)) {
                  message.warning("🐒 " + count + " minted")
                  console.log(" 🍾 Transaction " + update.hash + " finished!");
                  console.log(
                    " ⛽️ " +
                      update.gasUsed +
                      "/" +
                      (update.gasLimit || update.gas) +
                      " @ " +
                      parseFloat(update.gasPrice) / 1000000000 +
                      " gwei",
                  );
                }
                })
                console.log("awaiting metamask/web3 confirm result...", result);
                console.log(await result);
            }
         }
          >
            Mint Ape 🐒
          </Button>
           {/**
           * /////////
           * // NFT //
           * /////////
           */}
            <Divider /> 
        <h2> NFTs: </h2>
        Interacting with contract:
        <Input type="text" allowClear
       placeholder = {'Set contract address..'}
       onChange = { e => {
        updateNFT(e.target.value) }}
        />
         <br></br> <br></br>
         <Input type="text" allowClear
       placeholder = {'Id'}
       onChange = { e => {
        setTokenID(e.target.value) }}
        />
        <br></br><br></br>
         <Button
            type="primary"
            disabled = {!cloneInit || !NFT || !transferAddress}
            onClick={() => {
              /* look how you call setPurpose on your contract: */
              transferNFT()
            }}
          >
            Transfer NFT {TokenID}
          </Button>
       
        
       
          </div>
        
       <Divider/>
      Experimental Build by: &nbsp;
       <Address address="0x80bE2AeddBE606486291E4Ea3234CfcC757c8016" ensProvider={mainnetProvider} fontSize={16} /> 
       <br></br>
       🚨🚨🚨 Use at your own risk entirely! 


    </div>
   </div>
  );
}
