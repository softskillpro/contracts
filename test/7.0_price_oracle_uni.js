require("dotenv").config();

const config = require('../config.json');
const { expect } = require('chai');
//const provider = waffle.provider;
const abi = require('human-standard-token-abi');
const { setupContracts, log } = require('./helper');
import { keccak256 } from '@zoltu/ethereum-crypto'
const addr = config.addresses;
const OracleSdk = require('@keydonix/uniswap-oracle-sdk');
const OracleSdkAdapter = require('@keydonix/uniswap-oracle-sdk-adapter');
const JSON_RPC = 'https://eth-mainnet.alchemyapi.io/v2/yvNUUxaHJQbqtWh3T3Wjz5knUURdlRur';


const getStorageAt = async (address, position, block ) => {
  const provider = new ethers.providers.JsonRpcProvider(JSON_RPC)
  return provider.getStorageAt(ethers.utils.hexValue(address), position, block).then(value => BigInt(value))
}

const getProof = async (address, positions, block) => {
  const provider = new ethers.providers.JsonRpcProvider(JSON_RPC)
  const proof = await provider.send("eth_getProof", [ ethers.utils.hexValue(address), positions.map(value => ethers.utils.hexValue(value)), ethers.utils.hexValue(block)])
  return {
    accountProof: proof.accountProof.map((result) => ethers.utils.arrayify(result)),
    storageProof: proof.storageProof.map((result) => {
      return {
        key: BigInt(result.key),
        value: BigInt(result.value),
        proof: result.proof.map(result => ethers.utils.arrayify(result)),
      }
    }),
  }
}

const getBlockByNumber = async (blockNumber) => {
  const provider = new ethers.providers.JsonRpcProvider(JSON_RPC)
  const block = await provider.send("eth_getBlockByNumber", [(blockNumber !== 'latest') ? ethers.utils.hexValue(blockNumber): blockNumber, false])
  return {
    parentHash: BigInt(block.parentHash),
    sha3Uncles: BigInt(block.sha3Uncles),
    miner: BigInt(block.miner),
    stateRoot: BigInt(block.stateRoot),
    transactionsRoot: BigInt(block.transactionsRoot),
    receiptsRoot: BigInt(block.receiptsRoot),
    logsBloom: BigInt(block.logsBloom),
    difficulty: BigInt(block.difficulty),
    number: BigInt(block.number),
    gasLimit: BigInt(block.gasLimit),
    gasUsed: BigInt(block.gasUsed),
    timestamp: BigInt(block.timestamp),
    extraData: ethers.utils.arrayify(block.extraData),
    mixHash: BigInt(block.mixHash),
    nonce: BigInt(block.nonce),
  }
}

describe('Re-deploying the plexus contracts for PriceOracleUni test', () => {
  let priceOracleUni, owner;
  let usdtTokenAddress;
  let exchange;
  let price = 0;

  // Deploy and setup the contracts
  before(async () => {
    const { deployedContracts } = await setupContracts();
    priceOracleUni = deployedContracts.priceOracleUni;
    owner = deployedContracts.owner;
  });

  describe('Test Price Oracle uniswap ', () => {

    it('block verifier', async () => {
      const provider = new ethers.providers.JsonRpcProvider(JSON_RPC)
      const blockNumber = await provider.getBlockNumber();
      const getStorageAt = await OracleSdkAdapter.getStorageAtFactory(provider)
      const getProof = await OracleSdkAdapter.getProofFactory(provider)
      const getBlockByNumber = await OracleSdkAdapter.getBlockByNumberFactory(provider)


      // get the proof from the SDK
      usdtTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      let { status, events } = await (await priceOracleUni.getExchange(usdtTokenAddress)).wait();
      // Check if the txn is successful
      expect(status).to.equal(1);
      if (status === 1) {
        const exchangeAddressEvent = events.find((item) => {
          return item.event === "Exchange";
        })
        exchange = exchangeAddressEvent.args.exchange;
        log("exchange: ", exchange);
        log("block number: ", blockNumber);

        const proof = await OracleSdk.getProof(getStorageAt, getProof, getBlockByNumber, BigInt(exchange), BigInt(usdtTokenAddress), BigInt(blockNumber))

        // validate in TypeScript
        const rlpBlockHash = await keccak256.hash(proof.block)
        expect(rlpBlockHash).toEqual(block!.hash!)

        // validate in Solidity
        const { stateRoot, blockTimestamp } = await contracts.blockVerifierWrapper.extractStateRootAndTimestamp_(proof.block)
        expect(stateRoot).toEqual(block!.stateRoot)
        expect(blockTimestamp).toEqual(BigInt(block!.timestamp.getTime() / 1000))

      }
    })

    it('Should convert 2 ETH to DAI Token(s) from MakerDao via Uniswap', async () => {
      const provider = new ethers.providers.JsonRpcProvider(JSON_RPC)
      //const blockNumber = await provider.getBlockNumber();
      const blockNumber = BigInt("12680299")
      // const getStorageAt = await OracleSdkAdapter.getStorageAtFactory(provider)
      // const getProof = await OracleSdkAdapter.getProofFactory(provider)
      // const getBlockByNumber = await OracleSdkAdapter.getBlockByNumberFactory(provider)
      // get the proof from the SDK
      usdtTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      let { status, events } = await (await priceOracleUni.getExchange(usdtTokenAddress)).wait();
      // Check if the txn is successful
      expect(status).to.equal(1);
      if (status === 1) {
        const exchangeAddressEvent = events.find((item) => {
          return item.event === "Exchange";
        })
        exchange = exchangeAddressEvent.args.exchange;
        log("exchange: ", exchange);
        log("block number: ", blockNumber);

        const proof = await OracleSdk.getProof(getStorageAt, getProof, getBlockByNumber, BigInt(exchange), BigInt(usdtTokenAddress), BigInt(blockNumber));
        log('proof', proof);
        const { status1, events1 } = await (await priceOracleUni.getTokenPrice(usdtTokenAddress, proof, blockNumber)).wait();
        if (status1 === 1) {
          const priceEvent = events1.find((item) => {
            return item.event === "Price";
          })

          price = priceEvent.args.price;
          log("price: ", price);
        }
      }


    });
  });

});