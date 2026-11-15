const DOCUMENT_COLLECTION_CONFIG = {
  maxDocumentsPerScan: 300,
  skippedFolders: new Set(['.git', 'node_modules', 'dist', 'dist-electron']),
};

const SEMANTIC_CHUNK_CONFIG = {
  size: 900,
  overlap: 120,
};

const SEMANTIC_SCAN_PROFILES = {
  balanced: {
    maxAiChunks: 12,
    detectorBatchSize: 3,
    verifierEvidenceCharacters: 7600,
  },
  deep: {
    maxAiChunks: 24,
    detectorBatchSize: 3,
    verifierEvidenceCharacters: 14000,
  },
};

function getSemanticScanProfile(profileName) {
  return profileName === 'deep'
    ? { name: 'deep', ...SEMANTIC_SCAN_PROFILES.deep }
    : { name: 'balanced', ...SEMANTIC_SCAN_PROFILES.balanced };
}

module.exports = {
  DOCUMENT_COLLECTION_CONFIG,
  SEMANTIC_CHUNK_CONFIG,
  SEMANTIC_SCAN_PROFILES,
  getSemanticScanProfile,
};
