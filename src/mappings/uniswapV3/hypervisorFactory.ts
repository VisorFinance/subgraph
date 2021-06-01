import { Address } from '@graphprotocol/graph-ts'
import { HypervisorCreated } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3HypervisorFactory"
import { UniswapV3Hypervisor as HypervisorContract } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3Hypervisor"
import { ERC20 as ERC20Contract } from "../../../generated/UniswapV3HypervisorFactory/ERC20"
import { UniswapV3Hypervisor as HypervisorTemplate } from "../../../generated/templates"
import { Token, UniswapV3Pool, UniswapV3Hypervisor } from "../../../generated/schema"
import { fetchTokenDecimals } from "../../utils/tokens"

function createToken(tokenAddress: Address): Token {

	let contract = ERC20Contract.bind(tokenAddress)

	let token = new Token(tokenAddress.toHex())
	token.symbol = contract.symbol()
	token.name = contract.name()
	token.decimals = fetchTokenDecimals(tokenAddress)

	return token
}

export function handleHypervisorCreated(event: HypervisorCreated): void {

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
  	hypervisor.owner = hypervisorContract.owner()
  	hypervisor.symbol = hypervisorContract.symbol()
  	hypervisor.baseLower = hypervisorContract.baseLower()
  	hypervisor.baseUpper = hypervisorContract.baseUpper()
  	hypervisor.limitLower = hypervisorContract.limitLower()
  	hypervisor.limitUpper = hypervisorContract.limitUpper()
  	token0.save()
  	token1.save()
  	pool.save()
  	hypervisor.save()
	HypervisorTemplate.create(event.params.hypervisor)
}