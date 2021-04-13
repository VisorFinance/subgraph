import { log, store, Address, BigInt } from '@graphprotocol/graph-ts'
import { 
	Hypervisor as HyperVisorContract,
	BonusTokenRegistered,
	HypervisorCreated,
	HypervisorFunded,
	OwnershipTransferred,
	RewardClaimed,
	Staked,
	Unstaked,
	VaultFactoryRegistered,
	VaultFactoryRemoved
} from "../../generated/DAI-Hypervisor/Hypervisor"
import {
	Hypervisor
} from "../../generated/schema"


export function handleBonusTokenRegistered(event: BonusTokenRegistered): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.BonusTokens.push(event.params.token)
	hypervisor.save()
}

export function handleHypervisorCreated(event: HypervisorCreated): void {
	// OwnershipTransferred always happens before HypervisorCreated, so it's safe to load
	log.debug('transaction to address: {}', [event.transaction.to.toHex()])
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.powerSwitch = event.params.powerSwitch
	hypervisor.rewardPool = event.params.rewardPool
	hypervisor.rewardPoolAmount = BigInt.fromI32(0)

	let hypervisorContract = HyperVisorContract.bind(event.address)
	let callResults = hypervisorContract.getHypervisorData()
	hypervisor.stakingToken = callResults.stakingToken
	hypervisor.rewardToken = callResults.stakingToken
	hypervisor.save()
}

export function handleHypervisorFunded(event: HypervisorFunded): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.rewardPoolAmount += event.params.amount
	hypervisor.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	log.debug('Transferred address: {}', [event.address.toHex()])
	let hypervisor = Hypervisor.load(event.address.toHex())
	if (hypervisor == null) {
		hypervisor = new Hypervisor(event.address.toHex())
	}
	hypervisor.owner = event.params.newOwner
	hypervisor.save()
}

export function handleRewardClaimed(event: RewardClaimed): void {
	// there is both reward token and bonus token

}

export function handleStaked(event: Staked): void {
	// Add data to visor instance - amount staked

}

export function handleUnstaked(event: Unstaked): void {

}

export function handleVaultFactoryRegistered(event: VaultFactoryRegistered): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.vaultFactory = event.params.factory.toHex()
	hypervisor.save()
}

export function handleVaultFactoryRemoved(event: VaultFactoryRemoved): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.vaultFactory = null
	hypervisor.save()
}
