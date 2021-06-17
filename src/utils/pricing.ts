import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import { UniswapV3Hypervisor } from "../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import { UniswapV3Pool as PoolContract } from "../../generated/templates/UniswapV3Hypervisor/UniswapV3Pool"

const USDC_WETH_03_POOL = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8'
const WETH_VISR_03_POOL = "0x9a9cf34c3892acdb61fb7ff17941d8d81d279c75"

let Q192 = 2 ** 192
export function getExchangeRate(poolAddress: Address): BigDecimal[] {
    // Get ratios to convert token0 to token1 and vice versa
    let contract = PoolContract.bind(poolAddress)
    let slot0 = contract.slot0()
    let sqrtPriceX96 = slot0.value0
    let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal()
    let denom = BigDecimal.fromString(Q192.toString())
    let price1 = num / denom  // token0 * price1 = token0 in token1
    let price0 = denom / num  // token1 * price0 = token1 in token0

    return [price0, price1]
}


export function getEthRateInUSD(): BigDecimal {
    let DECIMAL_FACTOR = 10 ** 6
    let prices = getExchangeRate(Address.fromString(USDC_WETH_03_POOL))
    let ethRateInUSD = prices[0] / BigDecimal.fromString(DECIMAL_FACTOR.toString())
    return ethRateInUSD
}


export function getVisrRateInUSD(): BigDecimal{

    let ethRate = getEthRateInUSD()
    let prices = getExchangeRate(Address.fromString(WETH_VISR_03_POOL))

    return prices[0] * ethRate
}