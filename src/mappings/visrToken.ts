import { Address, BigInt } from '@graphprotocol/graph-ts'
import { ERC20 as ERC20Contract, Transfer as TransferEvent } from "../../generated/VisrToken/ERC20"
import { VisrToken,	Visor, StakedToken } from "../../generated/schema"
import { createStakedToken } from '../utils/tokens'
import { updateVisrTokenDayData } from '../utils/intervalUpdates'
import { ADDRESS_ZERO, ZERO_BI, ZERO_BD, RVISR_ADDRESS } from '../utils/constants'
import { getVisrRateInUSDC } from '../utils/pricing'
import { getOrCreateRewardHypervisor, getOrCreateRewardHypervisorShare, decreaseRewardHypervisorShares } from '../utils/rewardHypervisor'
import { recordVisrDistribution, unstakeVisrFromVisor } from '../utils/visrToken'

let DISTRIBUTORS: Array<Address> = [
	Address.fromString("0xe50df7cd9d64690a2683c07400ef9ed451c2ab31"),  // Distributor 1
	Address.fromString("0x354ad875a68e5d4ac69cb56df72137e638dcf4a0"),  // Distributor 2
	Address.fromString("0x3e738bef54e64be0c99759e0c77d9c72c5a8666e"),  // Distributor 3
	Address.fromString("0xa5025faba6e70b84f74e9b1113e5f7f4e7f4859f")   // Multisend App
]

let REWARD_HYPERVISOR = Address.fromString(RVISR_ADDRESS)

export function handleTransfer(event: TransferEvent): void {

	let visrAddress = event.address
	let visrAddressString = visrAddress.toHexString()

	let visrRate = ZERO_BD
	let visrAmount = event.params.value

	let visr = VisrToken.load(visrAddressString)
	if (visr === null) {
		visr = new VisrToken(visrAddressString)
		let visrContract = ERC20Contract.bind(visrAddress)
		visr.name = visrContract.name()
		visr.decimals = visrContract.decimals()
		visr.totalSupply = ZERO_BI
		visr.totalStaked = ZERO_BI
		visr.totalDistributed = ZERO_BI
		visr.totalDistributedUSD = ZERO_BD
	}

	if (event.params.from == Address.fromString(ADDRESS_ZERO)) {
		// Mint event
		visr.totalSupply += visrAmount
	}

	let distributed = ZERO_BI

	// Check if either from or to address are VISOR vaults
	let toString = event.params.to.toHexString()
	let fromString = event.params.from.toHexString()
	let visorTo = Visor.load(toString)
	let visorFrom = Visor.load(fromString)
	let rVisr = getOrCreateRewardHypervisor()
	
	if (event.params.to == REWARD_HYPERVISOR) {
		if (DISTRIBUTORS.includes(event.params.from)) {
			// VISR distribution event into rewards hypervisor
			visrRate = getVisrRateInUSDC()
			distributed += visrAmount
			// Track total amount stored in reward VISR
			rVisr.totalVisr += distributed
			// Tracks all time distributed
			visr.totalDistributed += distributed
			visr.totalDistributedUSD += distributed.toBigDecimal() * visrRate
		} else {
			// User deposit into reward hypervisor
			// Update reward hypervisor total
			rVisr.totalVisr += visrAmount
			// Update RewardHypervisorShare
			let rVisrShare = getOrCreateRewardHypervisorShare(fromString)
			rVisrShare.visrDeposited += visrAmount
			// Update visor entity
			if (visorFrom != null) {
				// Skip if address is not a visor vault
				visorFrom.visrStaked += visrAmount
				visorFrom.visrDeposited += visrAmount
				visorFrom.save()
			}
			// Update visr entity
			visr.totalStaked += visrAmount
			rVisrShare.save()
		}
		rVisr.save()
	} else if (event.params.from == REWARD_HYPERVISOR) {
		// User withdraw from reward hypervisor
		// Update reward hypervisor total
		rVisr.totalVisr -= visrAmount
		decreaseRewardHypervisorShares(toString, visrAmount, ZERO_BI)
		// update visor entity
		if (visorTo != null) {
			// Skip if address is not a visor vault
			unstakeVisrFromVisor(toString, visrAmount)
		}
		// update visr entity
		visr.totalStaked -= visrAmount
		rVisr.save()
	} else if (visorTo != null) {
		// VISR transferred into visor vault (staked)
		let stakedToken = StakedToken.load(toString + "-" + visrAddressString)
		if (stakedToken == null) {
			stakedToken = createStakedToken(event.params.to, visrAddress)
		}
		visorTo.visrStaked += visrAmount
		visorTo.visrDeposited += visrAmount
		stakedToken.amount += visrAmount
		// Track total VISR staked
		visr.totalStaked += visrAmount
		stakedToken.save()
		if (DISTRIBUTORS.includes(event.params.from)) {
			// Sender is fee distributor
			recordVisrDistribution(event)
			visrRate = getVisrRateInUSDC()
			distributed += visrAmount
			visr.totalDistributed += distributed
			visr.totalDistributedUSD += distributed.toBigDecimal() * visrRate
		}
		visorTo.save()
	} else if (visorFrom != null && event.params.value > ZERO_BI) {
		// VISR transferred out of visor vault (unstaked)
		let stakedToken = StakedToken.load(fromString + "-" + visrAddressString)
		stakedToken.amount -= visrAmount
		unstakeVisrFromVisor(fromString, visrAmount)
		// Track total VISR staked
		visr.totalStaked -= visrAmount
		stakedToken.save()
	}

	visr.save()	

	// Update daily distributed data
	if (distributed > ZERO_BI) {
		let visrTokenDayDataUTC = updateVisrTokenDayData(event, ZERO_BI)
		visrTokenDayDataUTC.distributed += distributed
		visrTokenDayDataUTC.distributedUSD += distributed.toBigDecimal() * visrRate
		visrTokenDayDataUTC.save()

		let visrTokenDayDataEST = updateVisrTokenDayData(event, BigInt.fromI32(-5))
		visrTokenDayDataEST.distributed += distributed
		visrTokenDayDataEST.distributedUSD += distributed.toBigDecimal() * visrRate
		visrTokenDayDataEST.save()
	}
}