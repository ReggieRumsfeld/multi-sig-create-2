import { Button, Card, DatePicker, Divider, Input, Progress, Slider, Spin, Switch, Tag, message} from "antd";
import React, { useState } from "react";
import { utils } from "ethers";
import { SyncOutlined, CheckCircleOutlined, DeleteOutlined } from "@ant-design/icons";

import { Address, Balance, Events } from "../components";


const { ethers } = require("ethers");
//0xaa8eb7890E20b1e271AA50300BD7DA6a142500b9
//0xD29596C61e0CBb2c73dBd2887DE215Bec5DC400B
//0x80bE2AeddBE606486291E4Ea3234CfcC757c8016

  const cloneInterface = new ethers.utils.Interface([
    "function initialized() public view returns (bool _init)",
    "function init(address[] memory _owners, uint _signaturesRequired)",
  ]);

export default function ExampleUI({
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
  wrapperAddress,
  cloneDeployed, 
  cloneInit,
  userSigner
}) {
  const [newPurpose, setNewPurpose] = useState("loading...");
  const [owner0, setOwner0] = useState();
  const [owner1, setOwner1] = useState();
  const [owner2, setOwner2] = useState();
  const funArr = [setOwner0, setOwner1, setOwner2];
  const owners = [owner0, owner1, owner2];
  

  const handleChange = (index) => (event) => {
    const input = event.target.value;
    console.log("Input: ", input);
    const isAddress = utils.isAddress(input);
    if (isAddress) {
      if (owners.find(element => element == input)) return message.warning("Owners need to be unique")
      funArr[index](input);
    }
   };

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        <h2>The MultiSIG - Wrapper:</h2>
        <i>Wraps a MultiSig Wallet Address around your EOA</i>
        <Divider />
        <i>IF deploying with: </i>
        <br></br>
        <h3>
          <Address address={address} ensProvider={mainnetProvider} fontSize={16} />
        </h3>
        <i>..your wallet will be launched at: </i>
        <br></br>
        <Address address={wrapperAddress} ensProvider={mainnetProvider} fontSize={32} />
        <br></br> <br></br>
        <i> You can use the wallet address as recipient before actually deploying the contract </i> <br></br>
        <h4> BUT CAUTION: Only the current address can initiate a wallet at that address!</h4>
        <Divider />
        <div style={{ margin: 8 }}>
          <h2>Deploy Wallet: </h2>
          {cloneDeployed ? (
            <Tag icon={<CheckCircleOutlined />} color={"success"}>
              Wallet deployed
            </Tag>
          ) : (
            <Button
              style={{ marginTop: 8 }}
              disabled={cloneDeployed}
                onClick={async () => {
                const result = tx(writeContracts.MultiSigFactory.createDeterministicMultiSig(), update => {
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
              }}
            >
              Deploy Wallet
            </Button>
          )}
        </div>
        <div style={{ margin: 8 }}>
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
              <Input type="text" allowClear onChange={handleChange(0)} /> <br></br>
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
              <Input type="text" allowClear onChange={handleChange(1)} /> <br></br>
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
              <Input type="text" allowClear onChange={handleChange(2)} /> <br></br>
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
                disabled={!cloneDeployed}
                  onClick={async () => {
                    if (owners.find(element => element == null)) return message.warning("You need three individual addresses to initiate")
                    const clone = new ethers.Contract(wrapperAddress, cloneInterface, userSigner);
                    console.log("Initialized from ExampleUI: ", await clone.init(owners, 2))

                  /*const result = tx(writeContracts.MetaMultiSigWallet.init(owners, 2), update => {
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
                  }); */
                 // console.log("awaiting metamask/web3 confirm result...", result);
                  // console.log(await result);
                }}
              >
                Initialize
              </Button>
            </div>
          )}
        </div>
        <Divider />
        {/* use utils.formatEther to display a BigNumber: */}
        <h2>Your Balance: {yourLocalBalance ? utils.formatEther(yourLocalBalance) : "..."}</h2>
        <div>OR</div>
        <Balance address={address} provider={localProvider} price={price} />
        <Divider />
        <div>🐳 Example Whale Balance:</div>
        <Balance balance={utils.parseEther("1000")} provider={localProvider} price={price} />
        <Divider />
        {/* use utils.formatEther to display a BigNumber: */}
        <h2>Your Balance: {yourLocalBalance ? utils.formatEther(yourLocalBalance) : "..."}</h2>
        <Divider />
        Factory Address: &nbsp;
        <Address
          address={readContracts && readContracts.MultiSigFactory ? readContracts.MultiSigFactory.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />{" "}
        <br></br>
        Wallet Logic: &nbsp;
        <Address
          address={readContracts && readContracts.MetaMultiSigWallet ? readContracts.MetaMultiSigWallet.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />
        <Divider />
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* look how you call setPurpose on your contract: */
              tx(writeContracts.YourContract.setPurpose("🍻 Cheers"));
            }}
          >
            Set Purpose to &quot;🍻 Cheers&quot;
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /*
              you can also just craft a transaction and send it to the tx() transactor
              here we are sending value straight to the contract's address:
            */
              tx({
                to: writeContracts.YourContract.address,
                value: utils.parseEther("0.001"),
              });
              /* this should throw an error about "no fallback nor receive function" until you add it */
            }}
          >
            Send Value
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* look how we call setPurpose AND send some value along */
              tx(
                writeContracts.YourContract.setPurpose("💵 Paying for this one!", {
                  value: utils.parseEther("0.001"),
                }),
              );
              /* this will fail until you make the setPurpose function payable */
            }}
          >
            Set Purpose With Value
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* you can also just craft a transaction and send it to the tx() transactor */
              tx({
                to: writeContracts.YourContract.address,
                value: utils.parseEther("0.001"),
                data: writeContracts.YourContract.interface.encodeFunctionData("setPurpose(string)", [
                  "🤓 Whoa so 1337!",
                ]),
              });
              /* this should throw an error about "no fallback nor receive function" until you add it */
            }}
          >
            Another Example
          </Button>
        </div>
      </div>

      {/*
        📑 Maybe display a list of events?
          (uncomment the event and emit line in YourContract.sol! )
      */}
      <Events
        contracts={readContracts}
        contractName="YourContract"
        eventName="SetPurpose"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />

      <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 256 }}>
        <Card>
          Check out all the{" "}
          <a
            href="https://github.com/austintgriffith/scaffold-eth/tree/master/packages/react-app/src/components"
            target="_blank"
            rel="noopener noreferrer"
          >
            📦 components
          </a>
        </Card>

        <Card style={{ marginTop: 32 }}>
          <div>
            There are tons of generic components included from{" "}
            <a href="https://ant.design/components/overview/" target="_blank" rel="noopener noreferrer">
              🐜 ant.design
            </a>{" "}
            too!
          </div>

          <div style={{ marginTop: 8 }}>
            <Button type="primary">Buttons</Button>
          </div>

          <div style={{ marginTop: 8 }}>
            <SyncOutlined spin /> Icons
          </div>

          <div style={{ marginTop: 8 }}>
            Date Pickers?
            <div style={{ marginTop: 2 }}>
              <DatePicker onChange={() => {}} />
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <Slider range defaultValue={[20, 50]} onChange={() => {}} />
          </div>

          <div style={{ marginTop: 32 }}>
            <Switch defaultChecked onChange={() => {}} />
          </div>

          <div style={{ marginTop: 32 }}>
            <Progress percent={50} status="active" />
          </div>

          <div style={{ marginTop: 32 }}>
            <Spin />
          </div>
        </Card>
      </div>
    </div>
  );
}
