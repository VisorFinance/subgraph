import { Address, BigDecimal, dataSource } from '@graphprotocol/graph-ts'
import { UniswapV3Pool as PoolContract } from "../../generated/templates/UniswapV3Hypervisor/UniswapV3Pool"
import { getOrCreateToken, isUSDC, isZero } from "./tokens"
import { ADDRESS_ZERO, ONE_BD, ZERO_BD, constantAddresses } from "./constants"
import { UniswapV3HypervisorConversion } from "../../generated/schema"


const USDC_DECIMAL_FACTOR = 10 ** 6
const Q192 = 2 ** 192
export function getExchangeRate(poolAddress: Address, baseTokenIndex: i32): BigDecimal {
    // Get ratios to convert token0 to token1 and vice versa
    let contract = PoolContract.bind(poolAddress)
    let slot0 = contract.slot0()
    let sqrtPriceX96 = slot0.value0
    let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal()
    let denom = BigDecimal.fromString(Q192.toString())
    
    let price = ZERO_BD
    if (baseTokenIndex == 0 && num != ZERO_BD) {
        price = denom / num  // This is rate of token1 in token0
    } else if (baseTokenIndex == 1 && denom != ZERO_BD) {
        price = num / denom  // This is rate of token0 in token1
    }
    return price
}

export function getEthRateInUSDC(): BigDecimal{

    let addressLookup = constantAddresses.network(dataSource.network())
    let poolAddress = addressLookup.get("WETH-USDC") as string

    let ethInUsdcRate = getExchangeRate(Address.fromString(poolAddress), 0)
    let rate = ethInUsdcRate / BigDecimal.fromString(USDC_DECIMAL_FACTOR.toString())

    return rate as BigDecimal
}

export function getVisrRateInUSDC(): BigDecimal{

    let addressLookup = constantAddresses.network(dataSource.network())
    let poolAddressVisr = addressLookup.get("WETH-VISR") as string
    let poolAddressUsdc = addressLookup.get("WETH-USDC") as string

    let visrInEthRate = getExchangeRate(Address.fromString(poolAddressVisr), 0)
    let ethInUsdcRate = getExchangeRate(Address.fromString(poolAddressUsdc), 0)
    let rate = visrInEthRate * ethInUsdcRate / BigDecimal.fromString(USDC_DECIMAL_FACTOR.toString())

    return rate as BigDecimal    
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
    return rate / BigDecimal.fromString(USDC_DECIMAL_FACTOR.toString())
}
