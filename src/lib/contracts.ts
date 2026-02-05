
import YellowChannelManagerABI from './abis/YellowChannelManager.json';
import RentalVaultABI from './abis/RentalVault.json';
import RentalManagerABI from './abis/RentalManager.json';

// TODO: Update these addresses with the values from your deployment output
export const CONTRACT_ADDRESSES = {
    // Base Sepolia
    84532: {
        YellowChannelManager: "0xd36b3657c2e3795e32f07A2f135BA51F8306521D",
        RentalVault: "0x97D23f400fcccc7Ba0eD53014ee83fAb89563749",
        RentalManager: "0x19b9Cc9A2EAC8d5275765E1584045258e6bc544a"
    },
    // Arbitrum Sepolia
    421614: {
        YellowChannelManager: "0xdD5c4453A3cADFA765dC5C79Cae273b63c3c9ed1",
        RentalVault: "0x8b6055998981d304e1162aFC4FA7443356507d9A",
        RentalManager: "0xC6906c4c6Cf34A662982E1407e903B1E669076B8"
    }
} as const;

export const ABIS = {
    YellowChannelManager: YellowChannelManagerABI,
    RentalVault: RentalVaultABI,
    RentalManager: RentalManagerABI
} as const;
