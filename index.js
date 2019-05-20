const platform = process.platform === 'win32' ? 'windows' : process.platform

module.exports = {
  name: 'swarm',
  displayName: 'Swarm',
  type: 'storage',
  repository: 'https://ethswarmstore.blob.core.windows.net',
  filter: {
    name: {
      includes: [platform]
    }
  },
  settings: [
    {
      id: 'bzzaccount',
      label: 'Bzz Account',
      flag: '--bzzaccount %s',
    },
    {
      id: 'password',
      label: 'Account Password',
      type: 'path',
      flag: '--password %s'
    },
    {
      id: 'cors',
      label: 'Cors Domain',
      default: 'http://localhost:3000',
      flag: '--corsdomain %s'
    }
  ],
  onInputRequested: (log, handleRequest) => {
    if (log.startsWith('Passphrase')) {
      console.log('plugin recognized input request for password')
      handleRequest('*******')
    }
  },
}
