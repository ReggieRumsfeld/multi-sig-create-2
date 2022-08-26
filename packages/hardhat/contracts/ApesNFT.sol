// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ApesNFT is ERC721 {
    
    address public owner;
    uint256 public count;

    constructor() ERC721("APESNFT", "APES") {
        owner = msg.sender;
    }

    function mint(address recipient, uint256 tokenId) external {
        require(msg.sender == owner, "Only Owner can perform this!");
        _mint(recipient, tokenId);
    }

    function safeMint(address recipient, uint256 tokenId) external {
        require(msg.sender == owner, "Only Owner can perform this!");
        _safeMint(recipient, tokenId);
    }

    //Troubleshoot helper safemint
    function isContract(address account) external view returns (bool) {
        return account.code.length > 0;
    }
}