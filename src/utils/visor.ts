import { BigInt } from '@graphprotocol/graph-ts'

export function visorAddressFromTokenId(tokenId: BigInt): string {
	
	const visorAddress = '0x' + tokenId.toHex().substring(2).padStart(40, "0")

	return visorAddress as string
}
