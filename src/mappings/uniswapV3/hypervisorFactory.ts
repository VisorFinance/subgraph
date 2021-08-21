import { Address } from '@graphprotocol/graph-ts'
import { HypervisorCreated } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3HypervisorFactory"
import { UniswapV3Hypervisor as HypervisorContract } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3Hypervisor"
import { 
    UniswapV3Pool,
    UniswapV3Hypervisor,
    UniswapV3HypervisorFactory
} from "../../../generated/schema"
import { 
    UniswapV3Hypervisor as HypervisorTemplate,
    UniswapV3Pool as PoolTemplate
} from "../../../generated/templates"
import { getOrCreatePool } from "../../utils/uniswapV3/pool"
import { createConversion } from "../../utils/tokens"
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
    factory.save()

    let hypervisorContract = HypervisorContract.bind(event.params.hypervisor)
    let hypervisorId = event.params.hypervisor.toHex()

    // Creating pool also creates tokens
    let poolAddress = hypervisorContract.pool()
    let pool = getOrCreatePool(poolAddress)

    // Update hypervisors linked to pool
    let hypervisors = pool.hypervisors
    hypervisors.push(hypervisorId)
    pool.hypervisors = hypervisors
    pool.save()

    let hypervisor = new UniswapV3Hypervisor(hypervisorId)
    hypervisor.pool = poolAddress.toHex()
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
    hypervisor.visorCount = ZERO_BI
    hypervisor.conversion = hypervisorId
    hypervisor.lastUpdated = event.block.timestamp
    hypervisor.save()

    // Create Conversion entity to track path to USD calculations
    createConversion(hypervisorId)

    HypervisorTemplate.create(event.params.hypervisor)
    PoolTemplate.create(poolAddress)
}
