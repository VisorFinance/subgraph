import { Address, BigInt } from '@graphprotocol/graph-ts'
import { ERC20 } from "../../generated/UniswapV3HypervisorFactory/ERC20"
import { Token, StakedToken, RewardedToken } from "../../generated/schema"
import { ZERO_BI, WETH_ADDRESS } from "./constants"



export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = null
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }

  return BigInt.fromI32(decimalValue as i32)
}

export function createToken(tokenAddress: Address): Token {

  let contract = ERC20.bind(tokenAddress)

  let token = new Token(tokenAddress.toHex())
  token.symbol = contract.symbol()
  token.name = contract.name()
  token.decimals = fetchTokenDecimals(tokenAddress)

  return token
}

export function createStakedToken(vaultAddress: Address, tokenAddress: Address): StakedToken {

  let token = Token.load(tokenAddress.toHexString())
  if (token == null) {
    token = createToken(tokenAddress)
    token.save()
  }

  let stakedTokenId = vaultAddress.toHexString() + "-" + tokenAddress.toHexString() 
  let stakedToken = new StakedToken(stakedTokenId)
  stakedToken.token = tokenAddress.toHexString()
  stakedToken.visor = vaultAddress.toHexString()
  stakedToken.amount = ZERO_BI

  return stakedToken
}

export function createRewardedToken(vaultAddress: Address, tokenAddress: Address): RewardedToken {

  let token = Token.load(tokenAddress.toHexString())
  if (token == null) {
    token = createToken(tokenAddress)
    token.save()
  }

  let rewardedTokenId = vaultAddress.toHexString() + "-" + tokenAddress.toHexString() 
  let rewardedToken = new RewardedToken(rewardedTokenId)
  rewardedToken.token = tokenAddress.toHexString()
  rewardedToken.visor = vaultAddress.toHexString()
  rewardedToken.amount = ZERO_BI

  return rewardedToken
}

export function isWETH(tokenAddress: Address): boolean {

  if (tokenAddress == Address.fromString(WETH_ADDRESS)){
    return true
  } else {
    return false
  }
}
