import { Address } from '@graphprotocol/graph-ts'
import { HypervisorCreated } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3HypervisorFactory"
import { UniswapV3Hypervisor as HypervisorContract } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3Hypervisor"
import { 
    UniswapV3Hypervisor as HypervisorTemplate,
    UniswapV3Pool as PoolTemplate
} from "../../../generated/templates"
import { UniswapV3Pool, UniswapV3Hypervisor, UniswapV3HypervisorFactory } from "../../../generated/schema"
import { getOrCreateToken } from "../../utils/tokens"
import { ZERO_BI, ONE_BI, ZERO_BD } from "../../utils/constants"

//Hypervisors that were created with invalid parameters and should not be indexed
let INVALID_HYPERVISORS: Array<Address> = [
    Address.fromString("0xce721b5dc9624548188b5451bb95989a7927080a"),  // CRV
    Address.fromString("0x0e9e16f6291ba2aaaf41ccffdf19d32ab3691d15")   // MATIC
]

export function handleHypervisorCreated(event: HypervisorCreated): void {

    if (INVALID_HYPERVISORS.includes(event.params.hypervisor)) return;

    let factoryAddressString = event.address.toHexString()

    let factory = UniswapV3HypervisorFactory.load(factoryAddressString)
    if (factory == null) {
        factory = new UniswapV3HypervisorFactory(factoryAddressString)
        factory.created = event.block.timestamp
        factory.hypervisorCount = ZERO_BI
        factory.grossFeesClaimedUSD = ZERO_BD
        factory.protocolFeesCollectedUSD = ZERO_BD
        factory.feesReinvestedUSD = ZERO_BD
        factory.tvlUSD = ZERO_BD
    }
    factory.hypervisorCount += ONE_BI

    let hypervisorContract = HypervisorContract.bind(event.params.hypervisor)
    let hypervisorId = event.params.hypervisor.toHex()

    let poolAddress = hypervisorContract.pool()
    let poolId = poolAddress.toHex()
    let token0Address = hypervisorContract.token0()
    let token1Address = hypervisorContract.token1()
    
    let token0 = getOrCreateToken(token0Address)
    let token1 = getOrCreateToken(token1Address)

    let pool = UniswapV3Pool.load(poolId)
    if (pool == null) {
        pool = new UniswapV3Pool(poolId)
        pool.hypervisors = []
        pool.token0 = token0Address.toHex()
        pool.token1 = token1Address.toHex()
        pool.fee = hypervisorContract.fee()
        pool.lastSwapTime = ZERO_BI
    }

    // Update hypervisors linked to pool
    let hypervisors = pool.hypervisors
    hypervisors.push(hypervisorId)
    pool.hypervisors = hypervisors

    let hypervisor = new UniswapV3Hypervisor(hypervisorId)
    hypervisor.pool = poolId
    hypervisor.factory = factoryAddressString
    hypervisor.owner = hypervisorContract.owner()
    hypervisor.symbol = hypervisorContract.symbol()
    hypervisor.created = event.block.timestamp.toI32()
    hypervisor.tick = hypervisorContract.currentTick()
    hypervisor.baseLower = hypervisorContract.baseLower()
    hypervisor.baseUpper = hypervisorContract.baseUpper()
    hypervisor.limitLower = hypervisorContract.limitLower()
    hypervisor.limitUpper = hypervisorContract.limitUpper()
    hypervisor.deposit0Max = hypervisorContract.deposit0Max()
    hypervisor.deposit1Max = hypervisorContract.deposit1Max()
    hypervisor.totalSupply = hypervisorContract.totalSupply()
    hypervisor.maxTotalSupply = hypervisorContract.maxTotalSupply()
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
    hypervisor.pricePerShare = ZERO_BD
    hypervisor.lastUpdated = event.block.timestamp

    token0.save()
    token1.save()
    pool.save()
    hypervisor.save()
    factory.save()
    HypervisorTemplate.create(event.params.hypervisor)
    PoolTemplate.create(poolAddress)
}