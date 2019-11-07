const AWS = require('aws-sdk')
const chalk = require('chalk')

/**
 * Get api key by name.
 * @param {string} key Api Key name.
 * @param {Object} apigateway AWS apigateway object
 * @param {Object} cli Serverless CLI object
 * @returns {Object} Api key info.
 */
const getApiKey = async (key, apigateway, cli) => {
  let position = null
  let keys = []
  try {
    while (true) {
      let resp = null
      if (!position) {
        resp = await apigateway.getApiKeys().promise()
      } else {
        resp = await apigateway.getApiKeys({ position }).promise()
      }
      keys = keys.concat(resp.items)
      if (resp.position) {
        position = resp.position
      } else {
        break
      }
    }
    return keys.find(k => k.name === key)
  } catch (error) {
    if (error.code === 'NotFoundException') {
      return undefined
    }
    cli.consoleLog(`EasyUsagePlanKey: ${chalk.red(`Failed to check if key already exists. Error ${error.message || error}`)}`)
    throw error
  }
}

/**
 * Main function that gets api key id by name.
 * @param {Object} serverless Serverless object
 */
const getApiKeyId = async (serverless) => {
  
  const template = serverless.service.provider.compiledCloudFormationTemplate

  await Promise.all(Object.keys(template["Resources"]).filter(key => {
    return !!~template["Resources"][key].Type.search('AWS::ApiGateway::UsagePlanKey')
  }).map(async key => {
    const usagePlanKey = template["Resources"][key]
    const apiKeyName = usagePlanKey.Properties ? usagePlanKey.Properties.KeyName : null

    if (apiKeyName) {
      serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.yellow(`find API key id using the API key name...`)}`)
      const provider = serverless.getProvider('aws')
      const awsCredentials = provider.getCredentials()
      const region = provider.getRegion()
      const ag = new AWS.APIGateway({ credentials: awsCredentials.credentials, region })
      const apiKey = await module.exports.getApiKey(apiKeyName, ag, serverless.cli)

      if (apiKey) {
        serverless.service.provider.compiledCloudFormationTemplate["Resources"][key].Properties.KeyId = apiKey.id
        serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.yellow(`API key id found successfully. KeyName(${apiKeyName}) apiKeyId(${apiKey.id})`)}`)
      } else {
        serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.red(`API key not found.`)}`)
      }
      delete serverless.service.provider.compiledCloudFormationTemplate["Resources"][key].Properties.KeyName
    } else {
      serverless.cli.consoleLog(`EasyUsagePlanKey: ${chalk.red(`API key name not found.`)}`)
    }
  }))
}

module.exports = {
  getApiKey,
  getApiKeyId
}