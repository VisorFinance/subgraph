import { BigInt, store } from '@graphprotocol/graph-ts'
import { ZERO_BI, RVISR_ADDRESS } from './constants'
import { RewardHypervisor, RewardHypervisorShare } from "../../generated/schema"


export function getOrCreateRewardHypervisor(): RewardHypervisor {
	
	let rhypervisor = RewardHypervisor.load(RVISR_ADDRESS)
	if (rhypervisor == null) {
		rhypervisor = new RewardHypervisor(RVISR_ADDRESS)
		rhypervisor.totalVisr = ZERO_BI
		rhypervisor.totalSupply = ZERO_BI
		rhypervisor.save()
	}

	return rhypervisor as RewardHypervisor
}

export function getOrCreateRewardHypervisorShare(visorAddress: string): RewardHypervisorShare {
	
	let id = RVISR_ADDRESS + "-" + visorAddress

	let rvisrShare = RewardHypervisorShare.load(id)
	if (rvisrShare == null) {
		rvisrShare = new RewardHypervisorShare(id)
		rvisrShare.rewardHypervisor = RVISR_ADDRESS
		rvisrShare.visor = visorAddress
		rvisrShare.shares = ZERO_BI
		rvisrShare.visrDeposited = ZERO_BI
	}

	return rvisrShare as RewardHypervisorShare
}

export function decreaseRewardHypervisorShares(visorAddress: string, visrAmount: BigInt, shares: BigInt): void {

	let id = RVISR_ADDRESS + "-" + visorAddress

	let rvisrShare = RewardHypervisorShare.load(id)
	rvisrShare.visrDeposited -= visrAmount
	rvisrShare.shares -= shares
	if (rvisrShare.visrDeposited == ZERO_BI && rvisrShare.shares == ZERO_BI) {
		store.remove('RewardHypervisorShare', id)
	} else {
		rvisrShare.save()
	}
}
