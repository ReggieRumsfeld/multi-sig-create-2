// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol"; 
import {iBeacon} from "./Beacon.sol";
import "hardhat/console.sol";


interface iMultiSigFactory {
    function predictMultiSigAddress(address user) external view returns (address instance);
}

/*
contract Factory {

    function createClone (address implementation) external returns (address instance) {
        return Clones.clone(implementation);
    } 

   
    function predictDeterministicAddress(address implementation, bytes32 salt) internal view returns (address instance) {
        return Clones.predictDeterministicAddress(implementation, salt, address(this));
    }

     function createDeterministicClone(address implementation, bytes32 salt) internal returns (address instance) {
        return Clones.cloneDeterministic(implementation, salt);
    }
} */

contract MultiSigFactory is iMultiSigFactory {

    iBeacon beacon;

    event MultiSigCreated(address indexed clone, address intiator);

    constructor(address beaconAddress) {
        require(beaconAddress != address(0), "No beacon at address(0)");
        beacon = iBeacon(beaconAddress);
    }

    function predictMultiSigAddress(address user) external view override returns (address instance) {
        require(beacon.getFactory() == address(this), "Wrong beacon or not properly initialized beacon");
        bytes32 salt = keccak256(abi.encodePacked(user));
        //return predictDeterministicAddress(beacon.getImplementation(), salt);
         address logic = beacon.getImplementation();
        console.log("Logic/Implementation Address: ", logic);
        instance = Clones.predictDeterministicAddress(logic, salt, address(this));
    }

    function createDeterministicMultiSig() external returns (address instance) {
        require(beacon.getFactory() == address(this), "Wrong beacon or not properly initialized beacon");
        bytes32 salt = keccak256(abi.encodePacked(msg.sender));
        address logic = beacon.getImplementation();
        console.log("Logic/Implementation Address: ", logic);
        instance = Clones.cloneDeterministic(logic, salt);
        emit MultiSigCreated(instance, msg.sender);
    }
}