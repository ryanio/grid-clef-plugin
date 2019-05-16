const platform = process.platform === 'win32' ? 'windows' : process.platform

module.exports = {
  name: 'swarm',
  displayName: 'Swarm',
  type: 'storage',
  repository: 'https://gethstore.blob.core.windows.net',
  filter: {
    name: {
      includes: [platform]
    }
  }
}
