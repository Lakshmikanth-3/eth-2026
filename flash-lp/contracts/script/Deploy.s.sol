// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/RentalVault.sol";
import "../src/RentalManager.sol";
import "../src/YellowChannelManager.sol";

/**
 * @title DeployAll
 * @notice Deployment script for all Flash LP contracts
 */
contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy YellowChannelManager
        YellowChannelManager yellowManager = new YellowChannelManager();
        console.log("YellowChannelManager deployed at:", address(yellowManager));
        
        // 2. Deploy RentalVault
        RentalVault vault = new RentalVault();
        console.log("RentalVault deployed at:", address(vault));
        
        // 3. Deploy RentalManager
        RentalManager manager = new RentalManager(
            address(yellowManager),
            address(vault)
        );
        console.log("RentalManager deployed at:", address(manager));
        
        // 4. Set RentalManager as vault owner (so it can lock/unlock positions)
        vault.transferOwnership(address(manager));
        console.log("Vault ownership transferred to RentalManager");
        
        vm.stopBroadcast();
        
        // Output deployment summary
        console.log("\\n=== DEPLOYMENT COMPLETE ===");
        console.log("Network:", block.chainid);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("\\nContract Addresses:");
        console.log("YellowChannelManager:", address(yellowManager));
        console.log("RentalVault:", address(vault));
        console.log("RentalManager:", address(manager));
        console.log("\\nSave these addresses for frontend integration!");
    }
}
