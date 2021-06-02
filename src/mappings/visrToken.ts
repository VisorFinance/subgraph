import { log, Address, BigInt } from '@graphprotocol/graph-ts'
import { ERC20 as ERC20Contract, Transfer as TransferEvent } from "../../generated/VisrToken/ERC20"
import { VisrToken,	Visor } from "../../generated/schema"
import { ADDRESS_ZERO, ZERO_BI } from '../utils/constants'

export function handleTransfer(event: TransferEvent): void {
	let visr = VisrToken.load(event.address.toHexString())
	if (visr === null) {
		visr = new VisrToken(event.address.toHexString())
		let visrContract = ERC20Contract.bind(event.address)
		visr.name = visrContract.name()
		visr.decimals = visrContract.decimals()
		visr.totalSupply = ZERO_BI
		visr.staked = ZERO_BI
	}

	if (event.params.from == Address.fromString(ADDRESS_ZERO)) {
		// Mint event
		visr.totalSupply += event.params.value
	}

	// Check if either from or to address are VISOR vaults
	let visorFrom = Visor.load(event.params.from.toHexString())
	let visorTo = Visor.load(event.params.to.toHexString())
	if (visorFrom != null) {
		// VISR transferred into visor vault (staked)
		visr.staked -= event.params.value
	} else if (visorTo != null) {
		// VISR transferred out of visor vault (unstaked)
		visr.staked += event.params.value
	}

	visr.save()
}