import { log, ethereum } from '@graphprotocol/graph-ts'
import { VisrToken, VisrTokenDayData, UniswapV3HypervisorDayData, UniswapV3Hypervisor } from '../../generated/schema'
import { ZERO_BI, ZERO_BD } from './constants'


export function updateVisrTokenDayData(event: ethereum.Event): VisrTokenDayData {
    let timestamp = event.block.timestamp.toI32()
    let dayID = timestamp / 86400
    let dayStartTimestamp = dayID * 86400
    let visr = VisrToken.load(event.address.toHexString())
    let visrDayData = VisrTokenDayData.load(dayID.toString())
    if (visrDayData == null) {
        visrDayData = new VisrTokenDayData(dayID.toString())
        visrDayData.date = dayStartTimestamp
        visrDayData.distributed = ZERO_BI
    }
    visrDayData.totalStaked = visr.totalStaked
    visrDayData.save()

    return visrDayData as VisrTokenDayData
}

export function updateUniswapV3HypervisorDayData(event: ethereum.Event): UniswapV3HypervisorDayData {
    let timestamp = event.block.timestamp.toI32()
    let dayID = timestamp / 86400
    let dayStartTimestamp = dayID * 86400
    let dayHypervisorID = event.address.toHexString().concat('-').concat(dayID.toString())
    let hypervisor = UniswapV3Hypervisor.load(event.address.toHexString())
    let hypervisorDayData = UniswapV3HypervisorDayData.load(dayHypervisorID)
    if (hypervisorDayData === null) {
        hypervisorDayData = new UniswapV3HypervisorDayData(dayHypervisorID)
        hypervisorDayData.date = dayStartTimestamp
        hypervisorDayData.hypervisor = event.address.toHexString()
        hypervisorDayData.deposited0 = ZERO_BI
        hypervisorDayData.deposited1 = ZERO_BI
        hypervisorDayData.depositedUSD = ZERO_BD
        hypervisorDayData.withdrawn0 = ZERO_BI
        hypervisorDayData.withdrawn1 = ZERO_BI
        hypervisorDayData.withdrawnUSD = ZERO_BD
        hypervisorDayData.grossFeesClaimed0 = ZERO_BI
        hypervisorDayData.grossFeesClaimed1 = ZERO_BI
        hypervisorDayData.grossFeesClaimedUSD = ZERO_BD
        hypervisorDayData.protocolFeesCollected0 = ZERO_BI
        hypervisorDayData.protocolFeesCollected1 = ZERO_BI
        hypervisorDayData.protocolFeesCollectedUSD = ZERO_BD
        hypervisorDayData.feesReinvested0 = ZERO_BI
        hypervisorDayData.feesReinvested1 = ZERO_BI
        hypervisorDayData.feesReinvestedUSD = ZERO_BD
        hypervisorDayData.tvl0 = ZERO_BI
        hypervisorDayData.tvl1 = ZERO_BI
        hypervisorDayData.tvlUSD = ZERO_BD
    }
    hypervisorDayData.tvl0 = hypervisor.tvl0
    hypervisorDayData.tvl1 = hypervisor.tvl1
    hypervisorDayData.tvlUSD = hypervisor.tvlUSD
    hypervisorDayData.save()

    return hypervisorDayData as UniswapV3HypervisorDayData
}