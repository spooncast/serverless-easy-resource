const helper = require('./helper')

class GetApiKeyId {
  constructor(serverless, options) {
    this.options = options
    this.hooks = {
      'after:aws:package:finalize:mergeCustomProviderResources': async () => {
        await helper.updateRestApiAndRootResourceId(serverless)
        await helper.updateApiKeyId(serverless)
        helper.setApiGatewayDeploymentTimestamp(serverless)
      }
    }
  }
}

module.exports = GetApiKeyId

