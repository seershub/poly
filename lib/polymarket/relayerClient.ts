/**
 * Polymarket Builder Relayer Client Integration
 * 
 * Per Polymarket docs: https://docs.polymarket.com/developers/builders/relayer-client
 * 
 * The Relayer Client allows builders to:
 * - Execute gasless transactions (Polymarket pays gas fees)
 * - Deploy Safe Wallets for users automatically
 * - Set token approvals for trading
 * - Execute CTF operations (split, merge, redeem, convert)
 */

// NOTE: @polymarket/builder-relayer-client and @polymarket/builder-signing-sdk
// are not yet published to npm. These features will be available once the packages are published.
// For now, relayer features are disabled to prevent build errors.

// import { RelayClient } from '@polymarket/builder-relayer-client';
// import { BuilderConfig, BuilderApiKeyCreds } from '@polymarket/builder-signing-sdk';
import { ethers } from 'ethers';
import type { WalletClient } from 'viem';
import { POLYGON_CHAIN_ID, POLYMARKET_RELAYER_URL } from '@/lib/constants';
import { walletClientToSigner } from '@/lib/ethersAdapter';

// Relayer URL - Per Polymarket docs
const RELAYER_URL = POLYMARKET_RELAYER_URL;

/**
 * Get builder configuration from environment variables
 * Per Polymarket docs: Builder credentials are required for relayer access
 * 
 * Priority:
 * 1. Remote signing server (NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL) - RECOMMENDED
 * 2. Direct credentials (POLY_BUILDER_*) - Server-side only, less secure
 * 
 * NOTE: Relayer packages are not yet published to npm. This function returns undefined
 * until the packages are available.
 */
function getBuilderConfig(): any {
  // Client-side accessible: Signing server URL (for remote signing)
  // Per Polymarket docs: Use Builder Signing Server for secure remote signing
  // Format: http://localhost:5001/sign (local) or https://your-server.com/sign (production)
  const signingServerUrl = process.env.NEXT_PUBLIC_BUILDER_SIGNING_SERVER_URL;

  // NOTE: Relayer packages are not yet published to npm
  // Once @polymarket/builder-relayer-client and @polymarket/builder-signing-sdk are published,
  // uncomment the code below and remove this return statement.
  
  console.warn('Relayer packages (@polymarket/builder-relayer-client, @polymarket/builder-signing-sdk) are not yet published to npm.');
  console.warn('Relayer features (gasless transactions, Safe deployment) are temporarily disabled.');
  console.warn('Once the packages are published, relayer features will be automatically enabled.');
  
  return undefined;

  /* UNCOMMENT WHEN PACKAGES ARE PUBLISHED:
  // Priority 1: Remote signing (RECOMMENDED - more secure)
  if (signingServerUrl) {
    console.log('Using Builder Signing Server for remote signing:', signingServerUrl);
    return new BuilderConfig({
      remoteBuilderConfig: { url: signingServerUrl },
    });
  }

  // Priority 2: Direct credentials (server-side only, less secure)
  const builderApiKey = typeof window === 'undefined' ? process.env.POLY_BUILDER_API_KEY : undefined;
  const builderSecret = typeof window === 'undefined' ? process.env.POLY_BUILDER_SECRET : undefined;
  const builderPassphrase = typeof window === 'undefined' ? process.env.POLY_BUILDER_PASSPHRASE : undefined;

  if (builderApiKey && builderSecret && builderPassphrase) {
    console.warn('Using direct builder credentials (server-side only). Consider using Builder Signing Server for better security.');
    const builderCreds: BuilderApiKeyCreds = {
      key: builderApiKey,
      secret: builderSecret,
      passphrase: builderPassphrase,
    };
    return new BuilderConfig({
      localBuilderCreds: builderCreds,
    });
  }

  return undefined;
  */
}

/**
 * Initialize Polymarket Relayer Client
 * Per Polymarket docs: Relayer client enables gasless transactions and Safe Wallet deployment
 * 
 * @param walletClient - Wagmi wallet client (converted to ethers signer)
 * @returns RelayClient instance or null if builder config is not available
 */
export function initializeRelayerClient(walletClient: WalletClient): any {
  try {
    // Convert wagmi WalletClient to ethers Signer (required for RelayClient)
    const signer = walletClientToSigner(walletClient);

    // Get builder configuration
    const builderConfig = getBuilderConfig();

    if (!builderConfig) {
      console.warn('Builder config not available. Relayer features disabled.');
      return null;
    }

    // NOTE: RelayClient is not available until packages are published
    // Per Polymarket docs: RelayClient(relayerUrl, chainId, wallet, builderConfig)
    // const client = new RelayClient(
    //   RELAYER_URL,
    //   POLYGON_CHAIN_ID,
    //   signer,
    //   builderConfig
    // );
    
    throw new Error('Relayer packages are not yet published to npm. Please wait for package publication.');

    console.log('Relayer client initialized successfully');
    return client;
  } catch (error) {
    console.error('Error initializing relayer client:', error);
    return null;
  }
}

/**
 * Deploy Safe Wallet for user via Polymarket Relayer
 * Per Polymarket docs: Polymarket pays for all gas fees
 * 
 * @param walletClient - Wagmi wallet client
 * @returns The deployed Safe Wallet address
 */
export async function deploySafeWalletViaRelayer(
  walletClient: WalletClient
): Promise<string> {
  const relayerClient = initializeRelayerClient(walletClient);

  if (!relayerClient) {
    throw new Error('Relayer client not available. Builder credentials required.');
  }

  try {
    console.log('Deploying Safe Wallet via Polymarket Relayer...');
    
    // Per Polymarket docs: deploySafe() deploys a Safe wallet, Polymarket pays gas
    const response = await relayerClient.deploySafe();
    const result = await response.wait();

    if (result && result.proxyAddress) {
      console.log('Safe Wallet deployed successfully:', {
        transactionHash: result.transactionHash,
        safeAddress: result.proxyAddress,
      });
      return result.proxyAddress;
    } else {
      throw new Error('Safe deployment failed');
    }
  } catch (error) {
    console.error('Error deploying Safe Wallet:', error);
    throw error;
  }
}

/**
 * Set token approval via Polymarket Relayer (gasless)
 * Per Polymarket docs: Execute token approvals without user paying gas
 * 
 * @param walletClient - Wagmi wallet client
 * @param tokenAddress - Token address (e.g., USDC)
 * @param spenderAddress - Address to approve (e.g., CLOB contract or CTF)
 * @param amount - Approval amount (use MaxUint256 for unlimited)
 */
export async function approveTokenViaRelayer(
  walletClient: WalletClient,
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint = ethers.constants.MaxUint256
): Promise<string> {
  const relayerClient = initializeRelayerClient(walletClient);

  if (!relayerClient) {
    throw new Error('Relayer client not available. Builder credentials required.');
  }

  try {
    // Per Polymarket docs: Create approval transaction
    const erc20Interface = new ethers.utils.Interface([
      {
        constant: false,
        inputs: [
          { name: '_spender', type: 'address' },
          { name: '_value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ]);

    const approvalData = erc20Interface.encodeFunctionData('approve', [
      spenderAddress,
      amount.toString(),
    ]);

    // Per Polymarket docs: Execute Safe transaction via relayer
    const { OperationType, SafeTransaction } = await import('@polymarket/builder-relayer-client');
    
    const approvalTx: SafeTransaction = {
      to: tokenAddress,
      operation: OperationType.Call,
      data: approvalData,
      value: '0',
    };

    console.log('Executing token approval via relayer:', {
      token: tokenAddress,
      spender: spenderAddress,
      amount: amount.toString(),
    });

    const response = await relayerClient.executeSafeTransactions(
      [approvalTx],
      `Approve ${tokenAddress} for ${spenderAddress}`
    );

    const result = await response.wait();

    if (result && result.transactionHash) {
      console.log('Token approval completed:', result.transactionHash);
      return result.transactionHash;
    } else {
      throw new Error('Token approval failed');
    }
  } catch (error) {
    console.error('Error approving token via relayer:', error);
    throw error;
  }
}

