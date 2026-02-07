// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {V4TestRouter} from "./V4TestRouter.sol";

contract LiquidityManager is V4TestRouter {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    constructor(IPoolManager _manager) V4TestRouter(_manager) {}

    function initializePools(address _usdc, address _weth, uint160 _sqrtPriceX96) external {
        PoolKey memory wethUsdcPool = PoolKey({
            currency0: Currency.wrap(_weth < _usdc ? _weth : _usdc),
            currency1: Currency.wrap(_weth < _usdc ? _usdc : _weth),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        manager.initialize(wethUsdcPool, _sqrtPriceX96);
    }

    function getPoolStatus(PoolKey memory key) external view returns (uint160 sqrtPriceX96, uint128 liquidity) {
        PoolId id = key.toId();
        (sqrtPriceX96, , , ) = manager.getSlot0(id);
        liquidity = manager.getLiquidity(id);
    }
}