const getPreHash = (wallet, chain, nonce, to, value, data) => {
  return ethers.utils.solidityKeccak256(
    ["address", "uint", "uint", "address", "uint", "bytes"],
    [wallet, chain, nonce, to, value, data]
  );
}

const getHashToSign = (hash) => {
  return ethers.utils.solidityKeccak256(
    ["string", "bytes32"],
    ["\x19Ethereum Signed Message:\n32", hash]
  );
}

module.exports = { getPreHash, getHashToSign }