// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {iMultiSigFactory} from "./MultiSigFactory.sol";
import {iBeacon} from "./Beacon.sol"; 
import "hardhat/console.sol"; 

contract MetaMultiSigWallet {
    using ECDSA for bytes32;

    mapping(address => bool) public isOwner;
    uint public signaturesRequired = 420; //add safeguard init of implem actually prevented by OI modifier
    uint public nonce;
    uint public chainId; // can't we use block.chainid??

    error NotAnOwner(uint index, address recovered, bytes32 preHash);

    event Deposit(address indexed sender, uint amount, uint balance);
    event ExecuteTransaction(uint256 indexed nonce, address indexed owner, address payable to, uint256 value, bytes data,  bytes32 hash, bytes result);
    event Owner(address indexed owner, bool added);
    /// (address to, uint nonce, uint value, address signer, bytes data)
    //event ProposedTx(bytes32 hash address indexed to, uint indexed nonce, address indexed signer, uint value, bytes data);
    //!!! Data == Signature
    event SubmitSig(uint indexed nonce, bytes32 indexed txHash, address indexed signer, bytes data); 

    modifier onlySelf() {
        require(msg.sender == address(this), "Not Self");
        //require(initialized(), "MultiSig has NOT been INITIALIZED!");
        _;
    }

    // TODO: Change Address - deploy to Rinkeby
    // Need to hardcode because ..complicated
    modifier originalInitiator() {
        iMultiSigFactory factory = iMultiSigFactory(getFactory());
        bytes32 salt = keccak256(abi.encodePacked(msg.sender));
        require(address(this) == factory.predictMultiSigAddress(msg.sender), "MSG.SENDER is not the originalInitiator!");
        require(!initialized(), "MultiSig has already been initialized!");
        _;
    }

    function init(address[] memory _owners, uint _signaturesRequired) external originalInitiator {
        require(_signaturesRequired > 0, "Cannot set 0 signatures");
        require(_signaturesRequired <= _owners.length, "Can't require more sigs then owners to be set");
        signaturesRequired = _signaturesRequired;
        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "constructor: zero address");
            require(!isOwner[owner], "constructor: owner not unique");
            isOwner[owner] = true;
            emit Owner(owner, isOwner[owner]);
        }
        chainId = block.chainid;
    }

    receive() payable external {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /// ======== ADMIN FUNCTIONS ========
    function addSigner(address newSigner, uint256 newSignaturesRequired) public onlySelf {
        require(newSigner != address(0), "addSigner: zero address");
        require(!isOwner[newSigner], "addSigner: owner not unique");
        require(newSignaturesRequired > 0, "addSigner: must be non-zero sigs required");
        isOwner[newSigner] = true;
        signaturesRequired = newSignaturesRequired;
        emit Owner(newSigner, isOwner[newSigner]);
    }

    function removeSigner(address oldSigner, uint256 newSignaturesRequired) public onlySelf {
        require(isOwner[oldSigner], "removeSigner: not owner");
        require(newSignaturesRequired > 0, "removeSigner: must be non-zero sigs required");
        isOwner[oldSigner] = false;
        signaturesRequired = newSignaturesRequired;
        emit Owner(oldSigner, isOwner[oldSigner]);
    }

    function updateSignaturesRequired(uint256 newSignaturesRequired) public onlySelf {
        require(newSignaturesRequired > 0, "updateSignaturesRequired: must be non-zero sigs required");
        signaturesRequired = newSignaturesRequired;
    }

    /// ========= EXECUTION ===========

    function getTransactionHash(uint256 _nonce, address to, uint256 value, bytes memory data) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data));
    }

    function executeTransaction(address payable to, uint256 value, bytes memory data, bytes[] memory signatures)
        external
        returns (bytes memory)
    {
        require(isOwner[msg.sender], "executeTransaction: only owners can execute");
        bytes32 _hash =  getTransactionHash(nonce, to, value, data);
        nonce++;
        uint256 validSignatures;
        address duplicateGuard;
        for (uint i = 0; i < signatures.length; i++) {
            address recovered = recover(_hash, signatures[i]);
            require(recovered > duplicateGuard, "executeTransaction: duplicate or unordered signatures");
            duplicateGuard = recovered;
            if(!isOwner[recovered]) revert NotAnOwner({index: i, recovered: recovered, preHash: _hash});
              validSignatures++;
        }

        require(validSignatures>=signaturesRequired, "executeTransaction: not enough valid signatures");

        (bool success, bytes memory result) = to.call{value: value}(data);
        require(success, "executeTransaction: tx failed");

        emit ExecuteTransaction(nonce-1, msg.sender, to, value, data, _hash, result);
        return result;
    }

    function recover(bytes32 _hash, bytes memory _signature) public pure returns (address) {
        return _hash.toEthSignedMessageHash().recover(_signature);
    }

    /// ======== PROPOSING TX ==========

    function submitSig( 
        address to,
        uint value,
        bytes calldata data, 
        bytes calldata signature
        ) external returns (bytes32 txHash) {
        uint _nonce = nonce;
        txHash = getTransactionHash(_nonce, to, value, data);
        address signer = recover(txHash, signature);
        require(isOwner[signer], "Not a valid signer");
        emit SubmitSig(nonce, txHash, signer, signature);
    }

    /// ========== Beacon ========

    function getBeacon() public view returns (iBeacon) {
        if(block.chainid == 31337) return iBeacon(address(0x5FbDB2315678afecb367f032d93F642f64180aa3)); // accounts[0] nonce 1 create
        //return iBeacon(address(0x4a099ddC6c600220A2f987F23e6501D25B0B6ae0));   // Rinkeby Beacon Address 
        return iBeacon(address(0xF32377B3A9c204Db0694ca483f4009304857E6c6));
    }

    function getImplementation() public view returns (address) {
        iBeacon beacon = getBeacon();
        return beacon.getImplementation();
    }

    function getFactory() public view returns (address) {
        iBeacon beacon = getBeacon();
        return beacon.getFactory();
    }


    /// ======== HELPERS ========

    function initialized() public view returns (bool _init) {
        _init = signaturesRequired > 0;
    }

 
}