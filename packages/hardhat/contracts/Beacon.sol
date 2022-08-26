// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;


interface iBeacon {
    function getFactory() external view returns (address);
    function getImplementation() external view returns (address);  
}


contract Beacon is iBeacon {
    address cloneFactory;
    address implementation;
    address beaconDeployer;
    
    constructor() {
        beaconDeployer = msg.sender;
    }

    function init(address _implementation, address _factory) external {
        require(msg.sender == beaconDeployer, "Only the beaconDeployer can perform this");
        setImplementation(_implementation);
        setFactory(_factory);
    }

     function getImplementation() external view override returns (address) {
        return implementation;
    }

     function getFactory() external view override returns (address) {
        return cloneFactory;
    }   


    function setImplementation(address _implementation) internal {
        require(_implementation != address(0), "Can't set implementation to address(0)"); 
        require(implementation == address(0), "Implementation has already been set");
        implementation = _implementation;
    }

    function setFactory(address _factory) internal {
        require(_factory != address(0), "Can't set factoryaddress to address(0)");
        require(cloneFactory == address(0), "Factory has already been set"); // superfluous but dogmatic
        cloneFactory = _factory;
    }
}