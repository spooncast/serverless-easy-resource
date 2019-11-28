const AWS = require('aws-sdk')
const chalk = require('chalk')
const R = require('ramda')

/**
 * Get AWS Apigateway Resource by name.
 * @param {Object} apiGateway AWS Apigateway object.
 * @param {string} name rest Api name.
 * @param {Object} search search options.
 * @returns {Object} Apigateway resource.
 */
const getResourceByName = async (apiGateway, name, { type, nameKey, options={} }) => {
  try {
    const getAllResource = async (position = null, keys = []) => {
      if (position) options.position = position 
      const res = await apiGateway[`get${type}s`](options).promise()
      keys = keys.concat(res.items)
      return res.position ? getAllResource(res.position, keys) : Promise.resolve(keys)
    }
    const findByName = (_name) => (keys) => keys.find(k => k[nameKey] === _name)
    const findResource = (_name) => R.pipeP(getAllResource, findByName(_name))()
    return findResource(name)

  } catch (error) {
    if (error.code === 'NotFoundException') return undefined
    throw error
  }
}

/**
 * Get AWS Apigateway Resource by name.
 * @param {Object} serverless Serverless object.
 * @param {Object} search search options.
* @returns {Object} Apigateway resource.
 */
const getResource = async (serverless, { type, nameKey='name', options={} } ) => {
  const cliLog = (msg) => serverless.cli.consoleLog(`EasyUsagePlanKey: ${msg}`)
  const resourceName = serverless.service.custom &&
                     serverless.service.custom.apiGateway &&
                     serverless.service.custom.apiGateway[type] &&
                     serverless.service.custom.apiGateway[type].name
  if (!resourceName) return
  cliLog(chalk.yellow(`Find id using the name(${resourceName})...`))

  const provider = serverless.getProvider('aws')
  const awsCredentials = provider.getCredentials()
  const region = provider.getRegion()
  const apiGateway = new AWS.APIGateway({ credentials: awsCredentials.credentials, region })
  const resource = await getResourceByName(apiGateway, resourceName, { type, nameKey, options })
  return resource
}

/**
 * Get AWS Apigateway Resource by name.
 * @param {Object} serverless Serverless object.
 * @param {Object} search search options.
 * @param {Object} resource found resource object.
 */
const setResourceId = async (serverless, { type, nameKey='name', options={} }, resource) => {
  if (!resource) return
  const cliLog = (msg) => serverless.cli.consoleLog(`EasyUsagePlanKey: ${msg}`)
  const template = serverless.service.provider.compiledCloudFormationTemplate.Resources
  const search = new RegExp(`Variable.apiGateway.${type}.id`, 'g')
  const replace = R.curry((_search, replaceTo, string) => string.replace(_search, replaceTo))
  const replaceTemplate = replace(search)(resource.id)
  const getUpdatedTemplate = R.pipe(JSON.stringify, replaceTemplate, JSON.parse)
  serverless.service.provider.compiledCloudFormationTemplate.Resources = getUpdatedTemplate(template)

  if (resource) {
    cliLog(chalk.yellow(`Found [${type}] resource successfully. name(${resource[nameKey]}) id(${resource.id})`))
  } else {
    cliLog(chalk.red(`Not found [${type}] resource. name(${resource[nameKey]})`))
  }
  return resource
}

/**
 * function that gets rest api id by name.
 * @param {Object} serverless Serverless object
 */
const updateRestApiAndRootResourceId = async (serverless) => {
  const searchApiKeyId = { type: 'RestApi' }
  const getRestApiId = R.curry(getResource)(serverless)
  const setRestApiId = R.curry(setResourceId)(serverless)(searchApiKeyId)
  const runUpdateRestApiId = R.pipeP(getRestApiId, setRestApiId)
  const { id:restApiId } = await runUpdateRestApiId(searchApiKeyId)
  if (!restApiId) return
  const searchRootResourceKeyId = { type: 'Resource', nameKey: 'path', options: { restApiId } }
  const getApiResourceId = R.curry(getResource)(serverless)
  const setApiResourceId  = R.curry(setResourceId)(serverless)(searchRootResourceKeyId)
  const runUpdateApiResource = R.pipeP(getApiResourceId, setApiResourceId)
  await runUpdateApiResource(searchRootResourceKeyId)
}

/**
 * function that gets api key id by name.
 * @param {Object} serverless Serverless object
 */
const updateApiKeyId = async (serverless) => {
  const search = { type: 'ApiKey' }
  const getApiKeyId = R.curry(getResource)(serverless)
  const setApiKeyId = R.curry(setResourceId)(serverless)(search)
  const run = R.pipeP(getApiKeyId, setApiKeyId)
  await run(search)
}

/**
 * function that sets timestamp of ApiGateway deployment.
 * @param {Object} serverless Serverless object
 */
const setApiGatewayDeploymentTimestamp = (serverless) => {
  const ts = new Date().getTime()
  const resources = serverless.service.provider.compiledCloudFormationTemplate['Resources']
  const isDeployment = (resource) => !!~resource.Type.search('AWS::ApiGateway::Deployment')
  const setTimestamp = (timestamp) => {
    return (resource, key) => {
      resources[`${key}${timestamp}`] = resource
      delete resources[key]
      return resources[`${key}${timestamp}`]
    }
  }
  const hasDeploymentReference = (resource) => resource.Properties.DeploymentId && resource.Properties.DeploymentId.Ref
  const setTimestampDeploymentReference = (timestamp) => {
    return (resource) => {
      return resource.Properties.DeploymentId.Ref = `${resource.Properties.DeploymentId.Ref}${timestamp}`
    }
  }
  const setDeployment = R.pipe(R.filter(isDeployment), R.mapObjIndexed(setTimestamp(ts)))
  const setReference = R.pipe(R.filter(hasDeploymentReference), R.map(setTimestampDeploymentReference(ts)))
  setDeployment(resources)
  setReference(resources)
}

module.exports = {
  updateApiKeyId,
  updateRestApiAndRootResourceId,
  setApiGatewayDeploymentTimestamp
}