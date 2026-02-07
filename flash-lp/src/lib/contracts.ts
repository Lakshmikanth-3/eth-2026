
import YellowChannelManagerABI from './abis/YellowChannelManager.json';
import RentalVaultABI from './abis/RentalVault.json';
import RentalManagerABI from './abis/RentalManager.json';
import FlashLPABI from './abis/FlashLP.json';

// Only chains where FlashLP is deployed
export const DEPLOYED_CHAINS = [421614, 84532] as const;

// Contract addresses for FlashLP (new unified system with analytics)
export const CONTRACT_ADDRESSES = {
    // Ethereum Sepolia
    11155111: {
        FlashLP: "", // Not deployed yet
        V4Router: "0x6127b25A12AB31dF2B58Fe9DfFCba595AB927eA3",
        PoolManager: "0xf448192241A9BBECd36371CD1f446de81A5399d2",
        USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
    },
    // Arbitrum Sepolia
    421614: {
        FlashLP: "0x2b47973bbecb0d2bd635bd5f0f8e5138bc4d54b0", // Deployed & Verified with Channel support
        V4Router: "0x87bD55Ea0505005799a28D34B5Ca17f4c8d24301",
        PoolManager: "0x4e650C85801e9dC44313669b491d20DB864a5451",
        USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        WETH: "0x802CC0F559eBc79DA798bf3F3baB44141a1a06Ed",
        // Legacy contracts (kept for reference)
        YellowChannelManager: "0x92312a3c268184c28288b01485e36069502d9fa3",
        RentalVault: "0x8b6055998981d304e1162aFC4FA7443356507d9A",
        RentalManager: "0xC6906c4c6Cf34A662982E1407e903B1E669076B8"
    },
    // Base Sepolia
    84532: {
        FlashLP: "0x4ffeb090ba98760deb7815f40e0d29b9a07fa819", // Deployed & Verified with Channel support
        FlashLPV4: "0xd1d6793c117e3b950c98d96b3d21fceb7f80934c", // NEW: V4-integrated version with redeemPool
        V4Router: "0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0", // LiquidityManager with Redeem
        PoolManager: "0x1b832D5395A41446b508632466cf32c6C07D63c7",
        USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        WETH: "0x4200000000000000000000000000000000000006",
        // Legacy contracts (kept for reference)
        YellowChannelManager: "0xd546ed7c2e35f52187ab9160ebd1bf0713893be4",
        RentalVault: "0x97D23f400fcccc7Ba0eD53014ee83fAb89563749",
        RentalManager: "0x19b9Cc9A2EAC8d5275765E1584045258e6bc544a"
    }
} as const;

export const ABIS = {
    FlashLP: FlashLPABI,
    YellowChannelManager: YellowChannelManagerABI,
    RentalVault: RentalVaultABI,
    RentalManager: RentalManagerABI
} as const;

