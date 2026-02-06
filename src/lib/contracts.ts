
import YellowChannelManagerABI from './abis/YellowChannelManager.json';
import RentalVaultABI from './abis/RentalVault.json';
import RentalManagerABI from './abis/RentalManager.json';
import FlashLPABI from './abis/FlashLP.json';

// Only chains where FlashLP is deployed
export const DEPLOYED_CHAINS = [421614, 84532] as const;

// Contract addresses for FlashLP (new unified system with analytics)
export const CONTRACT_ADDRESSES = {
    // Arbitrum Sepolia
    421614: {
        FlashLP: "0x69F6115E380A92Fd23eDdf4E89aB6d2d178DC567",
        // Legacy contracts (kept for reference)
        YellowChannelManager: "0xdD5c4453A3cADFA765dC5C79Cae273b63c3c9ed1",
        RentalVault: "0x8b6055998981d304e1162aFC4FA7443356507d9A",
        RentalManager: "0xC6906c4c6Cf34A662982E1407e903B1E669076B8"
    },
    // Base Sepolia
    84532: {
        FlashLP: "0x8BC377c95BcF6B14c270dbA2597c3034adeb4815",
        // Legacy contracts (kept for reference)
        YellowChannelManager: "0xd36b3657c2e3795e32f07A2f135BA51F8306521D",
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

