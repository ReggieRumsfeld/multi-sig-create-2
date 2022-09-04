// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Bananas is ERC20 {

address public owner;

constructor() ERC20("Bananas", "BNNS") {
    owner = msg.sender; 
}

function mint(address recipient, uint256 amount) external {
    //require(msg.sender == owner, "Only Owner can mint"); 
    _mint(recipient, amount);
}
}