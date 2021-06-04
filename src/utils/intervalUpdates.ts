import { log, ethereum } from '@graphprotocol/graph-ts'
import { UniswapV3HypervisorDayData, UniswapV3Hypervisor } from '../../generated/schema'
import { ZERO_BI, ZERO_BD } from './constants'

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
  hypervisorDayData.grossFeesClaimed0 = hypervisor.grossFeesClaimed0
  hypervisorDayData.grossFeesClaimed1 = hypervisor.grossFeesClaimed1
  hypervisorDayData.grossFeesClaimedUSD = hypervisor.grossFeesClaimedUSD
  hypervisorDayData.protocolFeesCollected0 = hypervisor.protocolFeesCollected0
  hypervisorDayData.protocolFeesCollected1 = hypervisor.protocolFeesCollected1
  hypervisorDayData.protocolFeesCollectedUSD = hypervisor.protocolFeesCollectedUSD
  hypervisorDayData.feesReinvested0 = hypervisor.feesReinvested0
  hypervisorDayData.feesReinvested1 = hypervisor.feesReinvested1
  hypervisorDayData.feesReinvestedUSD = hypervisor.feesReinvestedUSD
  hypervisorDayData.tvl0 = hypervisor.tvl0
  hypervisorDayData.tvl1 = hypervisor.tvl1
  hypervisorDayData.tvlUSD = hypervisor.tvlUSD
  hypervisorDayData.save()

  return hypervisorDayData as UniswapV3HypervisorDayData
}