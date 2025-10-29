/**
 * Gasless Transaction Relayer Service
 * 
 * This service acts as a relayer for meta-transactions, enabling gasless
 * interactions for users with smart contract accounts.
 * 
 * In production, this would be a backend service that:
 * 1. Validates signatures
 * 2. Checks user allowance/rate limits
 * 3. Submits transactions on behalf of users
 * 4. Tracks gas costs for reimbursement/sponsorship
 */

import { ethers } from 'ethers';

export interface MetaTransactionRequest {
  to: string; // Contract address
  functionName: string;
  params: any[];
  signature: string;
  nonce: string;
  from: string; // User's address
}

export interface RelayerConfig {
  rpcUrl: string;
  privateKey: string; // Relayer's private key
  maxGasPrice: string;
  maxGasLimit: number;
}

export class GaslessRelayer {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private config: RelayerConfig;

  constructor(config: RelayerConfig) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
  }

  /**
   * Submit a meta-transaction on behalf of a user
   */
  async relayTransaction(
    request: MetaTransactionRequest,
    contractABI: any[]
  ): Promise<ethers.ContractReceipt> {
    // 1. Validate signature (verify user actually signed this)
    const isValid = await this.validateSignature(request);
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // 2. Check rate limits (prevent spam)
    const allowed = await this.checkRateLimit(request.from);
    if (!allowed) {
      throw new Error('Rate limit exceeded');
    }

    // 3. Create contract instance
    const contract = new ethers.Contract(request.to, contractABI, this.wallet);

    // 4. Submit transaction
    const tx = await contract[request.functionName](...request.params, {
      gasLimit: this.config.maxGasLimit,
    });

    // 5. Wait for confirmation
    const receipt = await tx.wait();

    // 6. Log gas usage for accounting
    await this.logGasUsage(request.from, receipt);

    return receipt;
  }

  /**
   * Validate that the signature matches the request
   */
  private async validateSignature(
    request: MetaTransactionRequest
  ): Promise<boolean> {
    try {
      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'string', 'bytes', 'bytes32'],
        [request.to, request.functionName, ethers.utils.defaultAbiCoder.encode(['tuple'], [request.params]), request.nonce]
      );

      const recoveredAddress = ethers.utils.verifyMessage(
        ethers.utils.arrayify(messageHash),
        request.signature
      );

      return recoveredAddress.toLowerCase() === request.from.toLowerCase();
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Check if user is within rate limits
   * In production, this would check Redis or a database
   */
  private async checkRateLimit(userAddress: string): Promise<boolean> {
    // TODO: Implement rate limiting logic
    // For example: max 10 transactions per hour per address
    return true;
  }

  /**
   * Log gas usage for reimbursement tracking
   */
  private async logGasUsage(
    userAddress: string,
    receipt: ethers.ContractReceipt
  ): Promise<void> {
    const gasUsed = receipt.gasUsed.toString();
    const effectiveGasPrice = receipt.effectiveGasPrice.toString();
    const totalCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    console.log(`[Relayer] Gas used for ${userAddress}:`, {
      gasUsed,
      effectiveGasPrice,
      totalCost: ethers.utils.formatEther(totalCost),
      txHash: receipt.transactionHash,
    });

    // TODO: Store in database for accounting/analytics
  }

  /**
   * Estimate gas for a meta-transaction
   */
  async estimateGas(
    request: Omit<MetaTransactionRequest, 'signature' | 'nonce'>,
    contractABI: any[]
  ): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(request.to, contractABI, this.wallet);
    
    const gasEstimate = await contract.estimateGas[request.functionName](
      ...request.params
    );

    return gasEstimate;
  }

  /**
   * Get relayer balance
   */
  async getBalance(): Promise<string> {
    const balance = await this.wallet.getBalance();
    return ethers.utils.formatEther(balance);
  }

  /**
   * Batch relay multiple transactions
   */
  async batchRelay(
    requests: MetaTransactionRequest[],
    contractABI: any[]
  ): Promise<ethers.ContractReceipt[]> {
    const receipts: ethers.ContractReceipt[] = [];

    for (const request of requests) {
      try {
        const receipt = await this.relayTransaction(request, contractABI);
        receipts.push(receipt);
      } catch (error) {
        console.error(`Failed to relay transaction for ${request.from}:`, error);
        // Continue with other transactions
      }
    }

    return receipts;
  }
}

/**
 * Client-side helper to prepare meta-transaction requests
 */
export async function prepareMetaTransaction(
  provider: ethers.providers.Web3Provider,
  contractAddress: string,
  functionName: string,
  params: any[],
  nonce: string
): Promise<Omit<MetaTransactionRequest, 'to'>> {
  const signer = provider.getSigner();
  const userAddress = await signer.getAddress();
  const chainId = (await provider.getNetwork()).chainId;

  // Create message hash
  const messageHash = ethers.utils.solidityKeccak256(
    ['address', 'string', 'bytes', 'bytes32', 'uint256'],
    [
      contractAddress,
      functionName,
      ethers.utils.defaultAbiCoder.encode(['tuple'], [params]),
      nonce,
      chainId,
    ]
  );

  // Sign message
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

  return {
    functionName,
    params,
    signature,
    nonce,
    from: userAddress,
  };
}

/**
 * API client for relayer service
 */
export class RelayerClient {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  /**
   * Submit meta-transaction to relayer API
   */
  async submitTransaction(
    request: MetaTransactionRequest
  ): Promise<{ txHash: string; success: boolean }> {
    const response = await fetch(`${this.apiUrl}/relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Relayer error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check relayer status and available balance
   */
  async getStatus(): Promise<{
    online: boolean;
    balance: string;
    queueLength: number;
  }> {
    const response = await fetch(`${this.apiUrl}/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch relayer status`);
    }

    return response.json();
  }

  /**
   * Estimate gas cost for a transaction
   */
  async estimateGas(
    request: Omit<MetaTransactionRequest, 'signature' | 'nonce'>
  ): Promise<{ gasEstimate: string; costInUSD: string }> {
    const response = await fetch(`${this.apiUrl}/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Estimation failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
let relayerClient: RelayerClient | null = null;

export function getRelayerClient(): RelayerClient {
  if (!relayerClient) {
    const apiUrl = process.env.NEXT_PUBLIC_RELAYER_API_URL || 'http://localhost:3001';
    relayerClient = new RelayerClient(apiUrl);
  }
  return relayerClient;
}
