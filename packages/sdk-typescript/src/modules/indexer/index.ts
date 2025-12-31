/**
 * Indexer Module
 *
 * On-chain transaction indexing for x402 payments and other blockchain events.
 *
 * @module modules/indexer
 */

export {
  X402TransactionIndexer,
  type X402PaymentData,
  type SignatureInfo,
  type X402IndexerConfig,
} from './X402TransactionIndexer.js'
