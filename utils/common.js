const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const fsExtra = require('fs-extra');  // Import fs-extra
const yaml = require('js-yaml');


// Function to read JSON from the file
async function readJsonFile(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading JSON file from ${filePath}:`, error);
      throw error;
    }
  }
  
  // Function to read YAML from the file
  async function readYamlFile(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return yaml.load(data);
    } catch (error) {
      console.error(`Error reading YAML file from ${filePath}:`, error);
      throw error;
    }
  }
  
  // Function to write updated YAML back to the file
  function writeYamlFile(filePath, data) {
    try {
      const yamlStr = yaml.dump(data, { noRefs: true });
      fs.writeFileSync(filePath, yamlStr, 'utf8');
    } catch (error) {
      console.error(`Error writing YAML file to ${filePath}:`, error);
      throw error;
    }
  }

  // Function to process the csn.json and extract required information
function processCsnData(csnData) {
    const servicesEntitiesMap = {};
    const services = [];
    const entities = [];
  
    // Step 1: Process services and entities to extract the mapping
    for (const key in csnData.definitions) {
      const definition = csnData.definitions[key];
  
      // If the kind is 'service'
      if (definition.kind === 'service') {
        const serviceName = key.split('.')[0]; // Extract service name
        const servicePath = definition['@path'] || '';
  
        // Add service to the services array
        services.push({
          name: serviceName,
          path: servicePath,
        });
  
        // Initialize empty array for the service in servicesEntitiesMap
        if (!servicesEntitiesMap[serviceName]) {
          servicesEntitiesMap[serviceName] = [];
        }
      }
  
      // If the kind is 'entity'
      if (definition.kind === 'entity') {
        const serviceName = key.split('.')[0]; // Extract service name
        const entityName = key.split('.')[1];  // Extract entity name
  
        // Add entity to the entities array
        entities.push({
          name: entityName,
          service: serviceName,
        });
  
        // Add the entity to the corresponding service in servicesEntitiesMap
        if (servicesEntitiesMap[serviceName]) {
          servicesEntitiesMap[serviceName].push(entityName);
        }
      }
    }
  
    //refactor services path to odata v4 endpoints
    if (services) {
      services.forEach((oService) => {
        if (oService.path === "") {
          // If path is empty, call generatepath function
          oService.path = parseServiceNameToV4Endpoint(oService.name);
        }
  
  
        // Ensure path ends with '/'
        if (!oService.path.endsWith('/')) {
          oService.path += '/';
        }
      })
    }
  
    return {
      servicesEntitiesMap,
      services,
      entities,
    };
  }
  
  function parseServiceNameToV4Endpoint(serviceName) {
    // Step 1: Remove "Service" suffix (if present)
    let endpoint = serviceName.replace(/Service$/, '');
  
    // Step 2: Convert the service name to lowercase
    endpoint = endpoint.toLowerCase();
  
    // Step 3: Insert hyphens where uppercase letters follow lowercase letters
    endpoint = endpoint.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  
    return `/odata/v4/${endpoint}`;
  }
  
  module.exports = {
    readJsonFile,
    readYamlFile,
    writeYamlFile,
    parseServiceNameToV4Endpoint,
    processCsnData
  };