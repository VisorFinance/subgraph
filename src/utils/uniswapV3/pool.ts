import { Address } from '@graphprotocol/graph-ts'
import { UniswapV3Pool as PoolContract } from "../../../generated/UniswapV3HypervisorFactory/UniswapV3Pool"
import { UniswapV3Pool } from "../../../generated/schema"
import { getOrCreateToken } from "../tokens"
import { ZERO_BI } from "../constants"

export function getOrCreatePool(poolAddress: Address): UniswapV3Pool {
	let pool = UniswapV3Pool.load(poolAddress.toHex())
    if (pool == null) {
        let poolContract = PoolContract.bind(poolAddress)
        
        let token0 = getOrCreateToken(poolContract.token0())
        let token1 = getOrCreateToken(poolContract.token1())
        token0.save()
        token1.save()

        pool = new UniswapV3Pool(poolAddress.toHex())
        pool.hypervisors = []
        pool.token0 = token0.id
        pool.token1 = token1.id
        pool.fee = poolContract.fee()
        pool.lastSwapTime = ZERO_BI
    }
    return pool as UniswapV3Pool
}