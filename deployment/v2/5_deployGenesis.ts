import { ethers, upgrades } from 'hardhat';
import { create2Deployment } from '../helpers/deployment-helpers';
import { PolygonZkEVMDeployer, Create2Deployer } from '../../typechain-types';
import { deployPolygonZkEVMDeployer } from '../helpers/deployment-helpers';

async function main() {
    const salt = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const [deployer] = await ethers.getSigners();

    const [zkEVMDeployerContract, keylessDeployer] = await deployPolygonZkEVMDeployer(
        deployer.address,
        deployer
    );
    console.log("zkEVMDeployerContract deployed to:", zkEVMDeployerContract.target);

    // Deploy proxy admin:
    const proxyAdminFactory = await ethers.getContractFactory(
        "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin",
        deployer
    );
    const deployTransactionAdmin = (await proxyAdminFactory.getDeployTransaction()).data;
    const dataCallAdmin = proxyAdminFactory.interface.encodeFunctionData("transferOwnership", [deployer.address]);
    const [proxyAdminAddress] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionAdmin,
        dataCallAdmin,
        deployer,
        null
    );
    console.log(`proxyAdminAddress: ${proxyAdminAddress}`);

    // Deploy implementation PolygonZkEVMBridge
    const polygonZkEVMBridgeFactory = await ethers.getContractFactory("PolygonZkEVMBridgeV2", deployer);
    const deployTransactionBridge = (await polygonZkEVMBridgeFactory.getDeployTransaction()).data;
    // Mandatory to override the gasLimit since the estimation with create are mess up D:
    const overrideGasLimit = BigInt(8000000);
    const [bridgeImplementationAddress] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionBridge,
        null,
        deployer,
        overrideGasLimit
    );
    console.log(`bridgeImplementationAddress: ${bridgeImplementationAddress}`);

    const transparentProxyFactory = await ethers.getContractFactory(
        "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
        deployer
    );
    const initializeEmptyDataProxy = "0x";
    const deployTransactionProxy = (
        await transparentProxyFactory.getDeployTransaction(
            bridgeImplementationAddress as string, // must have bytecode
            proxyAdminAddress as string,
            initializeEmptyDataProxy
        )
    ).data;

    const [proxyBridgeAddress] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionProxy,
        null,
        deployer,
        null
    );
    console.log(`proxyBridgeAddress: ${proxyBridgeAddress}`);

    const PolygonZkEVMGlobalExitRootL2Factory = await ethers.getContractFactory(
        "PolygonZkEVMGlobalExitRootL2",
        deployer
    );
    const polygonZkEVMGlobalExitRootL2 = await upgrades.deployProxy(PolygonZkEVMGlobalExitRootL2Factory, [], {
        initializer: false,
        constructorArgs: [proxyBridgeAddress],
        unsafeAllow: ["constructor", "state-variable-immutable"],
    });
    console.log(`polygonZkEVMGlobalExitRootL2 deployed to: ${polygonZkEVMGlobalExitRootL2.target}`);
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
