const helper = require('./helper')

class GetApiKeyId {
  constructor(serverless, options) {
    this.options = options
    this.hooks = {
      'after:aws:package:finalize:mergeCustomProviderResources': () => {
        helper.getApiKeyId(serverless)
      }
    }
  }
}

module.exports = GetApiKeyId
