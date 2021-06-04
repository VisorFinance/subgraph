import { log, Address } from '@graphprotocol/graph-ts'
import { HypervisorCreated } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3HypervisorFactory"
import { UniswapV3Hypervisor as HypervisorContract } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3Hypervisor"
import { ERC20 as ERC20Contract } from "../../../generated/UniswapV3HypervisorFactory/ERC20"
import { UniswapV3Hypervisor as HypervisorTemplate } from "../../../generated/templates"
import { Token, UniswapV3Pool, UniswapV3Hypervisor, UniswapV3HypervisorFactory } from "../../../generated/schema"
import { updateUniswapV3HypervisorDayData } from "../../utils/intervalUpdates"
import { createToken } from "../../utils/tokens"
import { ZERO_BI, ONE_BI, ZERO_BD } from "../../utils/constants"


export function handleHypervisorCreated(event: HypervisorCreated): void {

    let factoryAddressString = event.address.toHexString()

    let factory = UniswapV3HypervisorFactory.load(factoryAddressString)
    if (factory == null) {
        factory = new UniswapV3HypervisorFactory(factoryAddressString)
        factory.hypervisorCount = ZERO_BI
    }
    factory.hypervisorCount += ONE_BI

    let hypervisorContract = HypervisorContract.bind(event.params.hypervisor)

    let poolAddress = hypervisorContract.pool().toHex()
    let token0Address = hypervisorContract.token0()
    let token1Address = hypervisorContract.token1()
    
    let token0 = createToken(token0Address)
    let token1 = createToken(token1Address)

    let pool = new UniswapV3Pool(poolAddress)
    pool.token0 = token0Address.toHex()
    pool.token1 = token1Address.toHex()
    pool.fee = hypervisorContract.fee()

    let hypervisor = new UniswapV3Hypervisor(event.params.hypervisor.toHex())
    
    hypervisor.pool = poolAddress
    hypervisor.factory = factoryAddressString
    hypervisor.owner = hypervisorContract.owner()
    hypervisor.symbol = hypervisorContract.symbol()
    hypervisor.tick = hypervisorContract.currentTick()
    hypervisor.baseLower = hypervisorContract.baseLower()
    hypervisor.baseUpper = hypervisorContract.baseUpper()
    hypervisor.limitLower = hypervisorContract.limitLower()
    hypervisor.limitUpper = hypervisorContract.limitUpper()
    hypervisor.grossFeesClaimed0 = ZERO_BI
    hypervisor.grossFeesClaimed1 = ZERO_BI
    hypervisor.grossFeesClaimedUSD = ZERO_BD
    hypervisor.protocolFeesCollected0 = ZERO_BI
    hypervisor.protocolFeesCollected1 = ZERO_BI
    hypervisor.protocolFeesCollectedUSD = ZERO_BD
    hypervisor.feesReinvested0 = ZERO_BI
    hypervisor.feesReinvested1 = ZERO_BI
    hypervisor.feesReinvestedUSD = ZERO_BD
    hypervisor.tvl0 = ZERO_BI
    hypervisor.tvl1 = ZERO_BI
    hypervisor.tvlUSD = ZERO_BD

    token0.save()
    token1.save()
    pool.save()
    hypervisor.save()
    factory.save()
    HypervisorTemplate.create(event.params.hypervisor)
}