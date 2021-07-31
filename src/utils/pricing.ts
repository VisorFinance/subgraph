import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import { UniswapV3Pool as PoolContract } from "../../generated/templates/UniswapV3Hypervisor/UniswapV3Pool"
import { getOrCreateToken, isUSDC, isZero } from "./tokens"
import { ONE_BD, ZERO_BD } from "./constants"
import { UniswapV3HypervisorConversion } from "../../generated/schema"

const USDC_WETH_03_POOL = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8'
const WETH_VISR_03_POOL = "0x9a9cf34c3892acdb61fb7ff17941d8d81d279c75"

let Q192 = 2 ** 192
export function getExchangeRate(poolAddress: Address, baseTokenIndex: i32): BigDecimal {
    // Get ratios to convert token0 to token1 and vice versa
    let contract = PoolContract.bind(poolAddress)
    let slot0 = contract.slot0()
    let sqrtPriceX96 = slot0.value0
    let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal()
    let denom = BigDecimal.fromString(Q192.toString())
    
    let price = ZERO_BD
    if (baseTokenIndex == 0) {
        price = denom / num  // This is rate of token1 in token0
    } else if (baseTokenIndex == 1) {
        price = num / denom  // This is rate of token0 in token1
    }
    return price
}


export function getEthRateInUSDC(): BigDecimal {
    let price = getExchangeRate(Address.fromString(USDC_WETH_03_POOL), 0)
    return price
}

export function getVisrRateInUSD(): BigDecimal{

    let ethRate = getEthRateInUSDC()
    let price = getExchangeRate(Address.fromString(WETH_VISR_03_POOL), 0)

    return price * ethRate
}

export function getBaseTokenRateInUSDC(hypervisorId: string): BigDecimal {
    let conversion = UniswapV3HypervisorConversion.load(hypervisorId)
    let rate = ZERO_BD
    if (isZero(Address.fromString(conversion.baseToken))) {
        rate = ZERO_BD
    } else if (isUSDC(Address.fromString(conversion.baseToken))) {
        rate = ONE_BD
    } else {
        rate = getExchangeRate(Address.fromString(conversion.usdPool), conversion.usdTokenIndex)
    }
    // After conversions the rate will always be in USDC, which has 6 decimals
    let decimal_factor = 10 ** 6
    return rate / BigDecimal.fromString(decimal_factor.toString())
}
