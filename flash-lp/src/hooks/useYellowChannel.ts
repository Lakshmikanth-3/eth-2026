import { useState, useEffect, useRef } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import {
    NitroliteClient,
    WalletStateSigner,
    createECDSAMessageSigner,
    createCreateChannelMessage,
    createResizeChannelMessage,
    createCloseChannelMessage,
    createTransferMessage
} from '@erc7824/nitrolite'
import WebSocket from 'isomorphic-ws'
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains'
import type { Chain } from 'viem'

export interface YellowChannelState {
    channelId: string | null
    status: 'idle' | 'creating' | 'active' | 'closing' | 'closed' | 'error'
    balance: bigint
    counterpartyBalance: bigint
    nonce: number
    error: string | null
}

export interface UseYellowChannelReturn {
    state: YellowChannelState
    createChannel: (rentalId: number, counterparty: string, initialDeposit: bigint) => Promise<string>
    updateBalance: (amount: bigint) => Promise<void>
    settleChannel: () => Promise<void>
    transfer: (to: string, amount: string, asset: string) => Promise<void>
}

const YELLOW_WS_URL = 'wss://clearnet-sandbox.yellow.com/ws'
const YELLOW_CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131b262'
const YELLOW_ADJUDICATOR_ADDRESS = '0x7c7ccbc98469190849BCC6c926307794fDfB11F2'

/**
 * Hook for managing Yellow Network state channels during rentals
 */
export function useYellowChannel(): UseYellowChannelReturn {
    const { address } = useAccount()
    const publicClient = usePublicClient()
    const { data: walletClient } = useWalletClient()

    const [state, setState] = useState<YellowChannelState>({
        channelId: null,
        status: 'idle',
        balance: 0n,
        counterpartyBalance: 0n,
        nonce: 0,
        error: null
    })

    const wsRef = useRef<WebSocket | null>(null)
    const clientRef = useRef<NitroliteClient | null>(null)

    // Initialize Yellow Network client
    useEffect(() => {
        if (!publicClient || !walletClient || !address) return

        const chain = walletClient.chain
        if (!chain) return

        try {
            const client = new NitroliteClient({
                publicClient,
                walletClient,
                stateSigner: new WalletStateSigner(walletClient),
                addresses: {
                    custody: YELLOW_CUSTODY_ADDRESS,
                    adjudicator: YELLOW_ADJUDICATOR_ADDRESS
                },
                chainId: chain.id,
                challengeDuration: 3600n // 1 hour
            })

            clientRef.current = client
        } catch (error) {
            console.error('Failed to initialize Yellow client:', error)
            setState(prev => ({ ...prev, error: 'Failed to initialize Yellow client', status: 'error' }))
        }
    }, [publicClient, walletClient, address])

    // Create a new Yellow channel for a rental
    const createChannel = async (
        rentalId: number,
        counterparty: string,
        initialDeposit: bigint
    ): Promise<string> => {
        if (!clientRef.current || !address) {
            throw new Error('Client not initialized')
        }

        setState(prev => ({ ...prev, status: 'creating' }))

        try {
            // Connect to Yellow WebSocket
            const ws = new WebSocket(YELLOW_WS_URL)
            wsRef.current = ws

            return new Promise((resolve, reject) => {
                ws.onopen = async () => {
                    try {
                        // Determine token based on chain
                        const chain = walletClient?.chain
                        const token = chain?.id === sepolia.id
                            ? '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb' // ytest.usd on Sepolia
                            : '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // USDC on testnet

                        // Create session key signer
                        const sessionKey = generateSessionKey()
                        const sessionSigner = createECDSAMessageSigner(sessionKey)

                        // Create channel message
                        const createMsg = await createCreateChannelMessage(
                            sessionSigner,
                            {
                                chain_id: chain?.id || sepolia.id,
                                token: token
                            }
                        )

                        ws.send(createMsg)
                    } catch (error) {
                        reject(error)
                    }
                }

                ws.onmessage = async (event) => {
                    try {
                        const response = JSON.parse(event.data.toString())

                        if (response.res && response.res[1] === 'create_channel') {
                            const { channel_id, channel, state, server_signature } = response.res[2]

                            // Submit to blockchain
                            const unsignedInitialState = {
                                intent: state.intent,
                                version: BigInt(state.version),
                                data: state.state_data,
                                allocations: state.allocations.map((a: any) => ({
                                    destination: a.destination,
                                    token: a.token,
                                    amount: BigInt(a.amount)
                                }))
                            }

                            const result = await clientRef.current!.createChannel({
                                channel,
                                unsignedInitialState,
                                serverSignature: server_signature
                            })

                            const txHash = typeof result === 'string' ? result : result.txHash

                            // Wait for confirmation
                            await publicClient!.waitForTransactionReceipt({ hash: txHash })

                            setState({
                                channelId: channel_id,
                                status: 'active',
                                balance: initialDeposit,
                                counterpartyBalance: 0n,
                                nonce: 0,
                                error: null
                            })

                            resolve(channel_id)
                        }

                        if (response.error) {
                            reject(new Error(response.error.message))
                        }
                    } catch (error) {
                        reject(error)
                    }
                }

                ws.onerror = (error) => {
                    setState(prev => ({ ...prev, error: 'WebSocket error', status: 'error' }))
                    reject(error)
                }
            })
        } catch (error) {
            setState(prev => ({ ...prev, error: String(error), status: 'error' }))
            throw error
        }
    }

    // Update channel balance off-chain
    const updateBalance = async (amount: bigint) => {
        if (!state.channelId || !wsRef.current) {
            throw new Error('No active channel')
        }

        const newBalance = state.balance - amount
        const newCounterpartyBalance = state.counterpartyBalance + amount
        const newNonce = state.nonce + 1

        setState(prev => ({
            ...prev,
            balance: newBalance,
            counterpartyBalance: newCounterpartyBalance,
            nonce: newNonce
        }))
    }

    // Settle and close the channel
    const settleChannel = async () => {
        if (!state.channelId || !wsRef.current || !address) {
            throw new Error('No active channel')
        }

        setState(prev => ({ ...prev, status: 'closing' }))

        try {
            const sessionKey = generateSessionKey()
            const sessionSigner = createECDSAMessageSigner(sessionKey)

            const closeMsg = await createCloseChannelMessage(
                sessionSigner,
                state.channelId as `0x${string}`,
                address
            )

            wsRef.current.send(closeMsg)

            // Wait for close response
            return new Promise<void>((resolve, reject) => {
                const handler = (event: MessageEvent) => {
                    const response = JSON.parse(event.data.toString())

                    if (response.res && response.res[1] === 'close_channel') {
                        setState(prev => ({ ...prev, status: 'closed' }))
                        wsRef.current?.removeEventListener('message', handler)
                        resolve()
                    }

                    if (response.error) {
                        setState(prev => ({ ...prev, error: response.error.message, status: 'error' }))
                        reject(new Error(response.error.message))
                    }
                }

                wsRef.current?.addEventListener('message', handler)
            })
        } catch (error) {
            setState(prev => ({ ...prev, error: String(error), status: 'error' }))
            throw error
        }
    }

    // Transfer funds off-chain
    const transfer = async (to: string, amount: string, asset: string) => {
        if (!wsRef.current) {
            throw new Error('No active connection')
        }

        const sessionKey = generateSessionKey()
        const sessionSigner = createECDSAMessageSigner(sessionKey)

        const transferMsg = await createTransferMessage(
            sessionSigner,
            {
                destination: to,
                allocations: [{
                    asset: asset,
                    amount: amount
                }]
            },
            Date.now()
        )

        wsRef.current.send(transferMsg)
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close()
        }
    }, [])

    return {
        state,
        createChannel,
        updateBalance,
        settleChannel,
        transfer
    }
}

// Helper: Generate session keypair
function generateSessionKey(): `0x${string}` {
    // In production, use proper key generation
    // For now, use a random hex string
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return `0x${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
}
