import { Address } from '@graphprotocol/graph-ts'
import { ERC20 } from "../../generated/UniswapV3HypervisorFactory/ERC20"
import { ERC20SymbolBytes } from '../../generated/UniswapV3HypervisorFactory/ERC20SymbolBytes'
import { ERC20NameBytes } from '../../generated/UniswapV3HypervisorFactory/ERC20NameBytes'
import { StaticTokenDefinition } from './staticTokenDefinition'
import { 
  Token,
  StakedToken,
  RewardedToken,
  UniswapV3Pool,
  UniswapV3Hypervisor,
  UniswapV3HypervisorConversion 
} from "../../generated/schema"
import { ZERO_BI, ZERO_BD, ADDRESS_ZERO, USDC_ADDRESS, WETH_ADDRESS, DEFAULT_DECIMAL } from "./constants"


export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString()
      } else {
        // try with the static definition
        let staticTokenDefinition = StaticTokenDefinition.fromAddress(tokenAddress)
        if(staticTokenDefinition != null) {
          symbolValue = staticTokenDefinition.symbol
        }
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString()
      } else {
        // try with the static definition
        let staticTokenDefinition = StaticTokenDefinition.fromAddress(tokenAddress)
        if(staticTokenDefinition != null) {
          nameValue = staticTokenDefinition.name
        }
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

export function fetchTokenDecimals(tokenAddress: Address): i32 {
  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = DEFAULT_DECIMAL
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  } else {
    // try with the static definition
    let staticTokenDefinition = StaticTokenDefinition.fromAddress(tokenAddress)
    if(staticTokenDefinition != null) {
      return staticTokenDefinition.decimals
    }
  }

  return decimalValue as i32
}

export function getOrCreateToken(tokenAddress: Address): Token {

  let token = Token.load(tokenAddress.toHex())

  if (token == null) {
    token = new Token(tokenAddress.toHex())
    token.symbol = fetchTokenSymbol(tokenAddress)
    token.name = fetchTokenName(tokenAddress)
    token.decimals = fetchTokenDecimals(tokenAddress)
  }

  return token as Token
}

export function createStakedToken(vaultAddress: Address, tokenAddress: Address): StakedToken {

  let token = getOrCreateToken(tokenAddress)
  token.save()

  let stakedTokenId = vaultAddress.toHexString() + "-" + tokenAddress.toHexString() 
  let stakedToken = new StakedToken(stakedTokenId)
  stakedToken.token = tokenAddress.toHexString()
  stakedToken.visor = vaultAddress.toHexString()
  stakedToken.amount = ZERO_BI

  return stakedToken
}

export function createRewardedToken(vaultAddress: Address, tokenAddress: Address): RewardedToken {

  let token = getOrCreateToken(tokenAddress)
  token.save()

  let rewardedTokenId = vaultAddress.toHexString() + "-" + tokenAddress.toHexString() 
  let rewardedToken = new RewardedToken(rewardedTokenId)
  rewardedToken.token = tokenAddress.toHexString()
  rewardedToken.visor = vaultAddress.toHexString()
  rewardedToken.amount = ZERO_BI

  return rewardedToken
}

function isToken(tokenAddress: Address, refAddress: Address): boolean {
  if (tokenAddress == refAddress){
    return true
  } else {
    return false
  }
}

export function isUSDC(tokenAddress: Address): boolean {
  return isToken(tokenAddress, Address.fromString(USDC_ADDRESS))
}ADDRESS_ZERO

export function isZero(tokenAddress: Address): boolean {
  return isToken(tokenAddress, Address.fromString(ADDRESS_ZERO))
}

export function isNullEthValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001'
}


// These needs to be in reverse order of priority
let BASE_TOKENS: Array<string> = [
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",  // WBTC
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",  // WETH
    "0x6b175474e89094c44da98b954eedeac495271d0f",  // DAI
    "0xdac17f958d2ee523a2206206994597c13d831ec7",  // USDT
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"   // USDC
]

let CONVERSION_POOLS: Array<string> = [
    "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35",  // WBTC-USDC 0.3%
    "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",  // USDC-WETH 0.3%
    "0x6c6bc977e13df9b0de53b251522280bb72383700",  // DAI-USDC 0.05%
    "0x7858e59e0c01ea06df3af3d20ac7b0003275d4bf",  // USDC-USDT 0.05%
    "0x0000000000000000000000000000000000000000"
]

let USD_TOKEN_INDEX: Array<i32> = [
    1,
    0,
    1,
    0,
    -1,
]

export function createConversion(address: string): void {
  let hypervisor = UniswapV3Hypervisor.load(address)
  let pool = UniswapV3Pool.load(hypervisor.pool)
  let conversion = UniswapV3HypervisorConversion.load(address)
  // match with USDC and lookup pool address

  if (conversion == null) {
    conversion = new UniswapV3HypervisorConversion(address)
    let token0BaseIndex = BASE_TOKENS.indexOf(pool.token0)
    let token1BaseIndex = BASE_TOKENS.indexOf(pool.token1)

    // Reference arrays are in reverse order of priority. i.e. larger index take precedence
    if (token0BaseIndex > token1BaseIndex) {
      // token0 is the base token
      conversion.baseToken = pool.token0
      conversion.baseTokenIndex = 0
      conversion.usdPool = CONVERSION_POOLS[token0BaseIndex]
      conversion.usdTokenIndex = USD_TOKEN_INDEX[token0BaseIndex]
    } else if (token1BaseIndex > token0BaseIndex) {
      // token1 is the base token
      conversion.baseToken = pool.token1
      conversion.baseTokenIndex = 1
      conversion.usdPool = CONVERSION_POOLS[token1BaseIndex]
      conversion.usdTokenIndex = USD_TOKEN_INDEX[token1BaseIndex]
    } else {
      // This means token0 == token1 == -1, unidentified base token
      conversion.baseToken = ADDRESS_ZERO
      conversion.baseTokenIndex = -1
      conversion.usdPool = ADDRESS_ZERO
      conversion.usdTokenIndex = -1
    }
    conversion.priceTokenInBase = ZERO_BD
    conversion.priceBaseInUSD = ZERO_BD
    conversion.save()
  }
}