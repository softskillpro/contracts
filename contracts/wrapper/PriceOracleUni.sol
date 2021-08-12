// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../proxyLib/OwnableUpgradeable.sol";
import '../interfaces/uniswap/IUniswapV2Pair.sol';
import "../interfaces/uniswap/IUniswapV2.sol";
import "../interfaces/uniswap/IUniswapFactory.sol";
import '../libraries/UniswapOracle.sol';

contract PriceOracleUni is OwnableUpgradeable, UniswapOracle {
    address private uniFactoryAddress;
    address private denominationTokenAddress;
    event Price(uint256 price);
    event Exchange(address exchange);

    constructor() payable {
    }

    /**
     * @notice Initialize the PriceOracleUni contract
     * @param _uniFactoryAddress Address to the Uniswap factory contract
     */
    function initialize(
        address _uniFactoryAddress,
        address _denominationTokenAddress
    )
        public
        initializeOnceOnly
    {
        uniFactoryAddress = _uniFactoryAddress;
        denominationTokenAddress = _denominationTokenAddress;
    }

    function getTokenPrice(address tokenAddress, UniswapOracle.ProofData memory proofData, uint256 blockNumber) public returns (uint256 price, uint256 blockNum) {
        address pairAddr = IUniswapFactory(uniFactoryAddress).getPair(tokenAddress, denominationTokenAddress);
		(price, blockNum) = getPrice(IUniswapV2Pair(pairAddr), denominationTokenAddress, blockNumber, proofData);
		emit Price(price);
	}

    function getExchange(address tokenAddress) public returns (address) {
        address pairAddr = IUniswapFactory(uniFactoryAddress).getPair(tokenAddress, denominationTokenAddress);
        emit Exchange(pairAddr);
        return pairAddr;
    }
}
