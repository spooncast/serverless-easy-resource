const helper = require('./helper')

class GetApiKeyId {
  constructor(serverless, options) {
    this.options = options
    this.hooks = {
      'after:aws:package:finalize:mergeCustomProviderResources': async () => {
        await helper.getApiKeyId(serverless)
      },
      'before:aws:info:displayServiceInfo': async () => {
        await helper.setParameterStoreApiKey(serverless)
      }
    }
  }
}

module.exports = GetApiKeyId
