import { Address, BigInt } from '@graphprotocol/graph-ts'
import { ERC20 } from "../../generated/UniswapV3HypervisorFactory/ERC20"
import { Token } from "../../generated/schema"


export function createToken(tokenAddress: Address): Token {

  let contract = ERC20.bind(tokenAddress)

  let token = new Token(tokenAddress.toHex())
  token.symbol = contract.symbol()
  token.name = contract.name()
  token.decimals = fetchTokenDecimals(tokenAddress)

  return token
}

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
