
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174']
}))

app.use(express.json())

app.get('/api/transactions', async (req, res) => {
  const { address } = req.query

  const page = Math.max(
    1,
    Number.parseInt(req.query.page || '1', 10) || 1
  )

  if (
    typeof address !== 'string' ||
    !/^0x[a-fA-F0-9]{40}$/.test(address)
  ) {
    return res.status(400).json({
      error: 'Invalid wallet address',
    })
  }

  const apiKey = process.env.ETHERSCAN_API_KEY

  const getTransactions = async (chainId) => {

    // BASE menggunakan Blockscout
  
if (chainId === 8453) {
  const alchemyKey = process.env.ALCHEMY_BASE_API_KEY

  if (!alchemyKey) {
    throw new Error('Alchemy API key is missing')
  }

  const getTransfers = async (direction) => {
    const response = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            [direction]: address,
            category: ['external'],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: '0xa',
            order: 'desc',
          }],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Alchemy HTTP error: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message || 'Alchemy request failed')
    }

    return data.result?.transfers || []
  }

  const [outgoing, incoming] = await Promise.all([
    getTransfers('fromAddress'),
    getTransfers('toAddress'),
  ])

  const uniqueTransfers = new Map()

  for (const tx of [...outgoing, ...incoming]) {
    uniqueTransfers.set(tx.uniqueId || tx.hash, tx)
  }

  return [...uniqueTransfers.values()]
    .sort((a, b) =>
      new Date(b.metadata?.blockTimestamp || 0).getTime() -
      new Date(a.metadata?.blockTimestamp || 0).getTime()
    )
    .slice(0, 10)
    .map((tx) => ({
      hash: tx.hash,
      from: tx.from || '',
      to: tx.to || '',
      value: tx.rawContract?.value
        ? BigInt(tx.rawContract.value).toString()
        : '0',
      timeStamp: String(
        Math.floor(
          new Date(tx.metadata?.blockTimestamp || 0).getTime() / 1000
        )
      ),
      isError: '0',
    }))
}

    // ETHEREUM menggunakan Etherscan
    if (!apiKey) {
      throw new Error('Etherscan API key is missing')
    }

    const params = new URLSearchParams({
      chainid: String(chainId),
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: String(page),
      offset: '10',
      sort: 'desc',
      apikey: apiKey,
    })

    const response = await fetch(
      `https://api.etherscan.io/v2/api?${params}`
    )

    if (!response.ok) {
      throw new Error(`API HTTP error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === '1') {
      return data.result
    }

    if (
      data.message === 'No transactions found' ||
      data.result === 'No transactions found'
    ) {
      return []
    }

    throw new Error(
      data.result || data.message || 'Unable to fetch transactions'
    )
  }

  try {
    const results = await Promise.allSettled([
      getTransactions(1),
      getTransactions(8453),
    ])

    const ethereum = results[0].status === 'fulfilled'
      ? results[0].value
      : []

    const base = results[1].status === 'fulfilled'
      ? results[1].value
      : []

    res.json({
      ethereum,
      base,
      errors: {
        ethereum: results[0].status === 'rejected'
          ? results[0].reason.message
          : null,
        base: results[1].status === 'rejected'
          ? results[1].reason.message
          : null,
      },
    })

  } catch (error) {
    console.error('Transaction API error:', error)

    res.status(500).json({
      error: 'Unable to load transaction history',
      detail: error.message,
    })
  }
})

// TOKEN PORTFOLIO - BASE

app.get('/api/tokens', async (req, res) => {
  const { address } = req.query

  if (
    typeof address !== 'string' ||
    !/^0x[a-fA-F0-9]{40}$/.test(address)
  ) {
    return res.status(400).json({
      error: 'Invalid wallet address',
    })
  }

  const alchemyKey = process.env.ALCHEMY_BASE_API_KEY

  if (!alchemyKey) {
    return res.status(500).json({
      error: 'Alchemy API key is missing',
    })
  }

  const networks = [
    {
      name: 'Ethereum',
      rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    },
    {
      name: 'Base',
      rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    },
  ]

  const getTokens = async (network) => {
    const rpcCall = async (method, params) => {
      const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(
          data.error.message || 'Alchemy request failed'
        )
      }

      return data.result
    }

    const result = await rpcCall(
      'alchemy_getTokenBalances',
      [address, 'erc20']
    )

    const tokenBalances = (result.tokenBalances || [])
      .filter((token) =>
        token.tokenBalance &&
        BigInt(token.tokenBalance) > 0n
      )

    return Promise.all(
      tokenBalances.map(async (token) => {
        const metadata = await rpcCall(
          'alchemy_getTokenMetadata',
          [token.contractAddress]
        )

        const decimals = Number(metadata.decimals || 0)
        const rawBalance = BigInt(token.tokenBalance)
        const divisor = 10n ** BigInt(decimals)

        const whole = rawBalance / divisor
        const fraction = (rawBalance % divisor)
          .toString()
          .padStart(decimals, '0')
          .slice(0, 6)

        const balance = decimals > 0
          ? `${whole}.${fraction}`.replace(/\.?0+$/, '')
          : whole.toString()

        return {
          name: metadata.name || 'Unknown Token',
          symbol: metadata.symbol || 'UNKNOWN',
          contractAddress: token.contractAddress,
          decimals,
          balance,
          network: network.name,
        }
      })
    )
  }

  try {
    const results = await Promise.allSettled(
      networks.map((network) => getTokens(network))
    )

    const ethereum = results[0].status === 'fulfilled'
      ? results[0].value
      : []

    const base = results[1].status === 'fulfilled'
      ? results[1].value
      : []

    const errors = {
      ethereum: results[0].status === 'rejected'
        ? results[0].reason.message
        : null,

      base: results[1].status === 'rejected'
        ? results[1].reason.message
        : null,
    }

    const tokens = [...ethereum, ...base]

    res.json({
      address,
      totalTokens: tokens.length,
      ethereum,
      base,
      tokens,
      errors,
    })
  } catch (error) {
    console.error('Token API error:', error)

    res.status(500).json({
      error: 'Unable to load token balances',
      detail: error.message,
    })
  }
})
app.listen(PORT, () => {
  console.log(`NEXORA API running at http://localhost:${PORT}`)
})