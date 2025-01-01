const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const fsExtra = require('fs-extra');  // Import fs-extra
const yaml = require('js-yaml');
const Constants = require('./Constants');

const CTM_WEBAPP_NAME = Constants.CTM_WEBAPP_NAME;
const CTM_METADATA_JSON_FILE_NAME = Constants.CTM_METADATA_JSON_FILE_NAME;

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

  // Function to check if it's a Node.js project or Java project
function isJavaProject() {
  const pomFile = path.join(process.cwd(), 'pom.xml');
  return fs.existsSync(pomFile);
}

function isNodeProject() {
  const packageJsonFile = path.join(process.cwd(), 'package.json');
  return fs.existsSync(packageJsonFile);
}

// Function to execute a command and return a promise
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
}


// Function to build the project (either Java or Node.js)
async function buildProject() {
  if (isNodeProject()) {
    console.log('Detected Node.js project. Running "cds build"...');
    await executeCommand('cds build');
  } else if (isJavaProject()) {
    console.log('Detected Java project. Running "mvn clean install"...');
    await executeCommand('mvn clean install');
  } else {
    throw new Error('Not a valid Java or Node.js project');
  }
}

// Function to find the csn.json file
function findCsnJsonFile() {
  const genPath = isJavaProject() ? path.join(process.cwd(), 'target', 'gen') : path.join(process.cwd(), 'gen', 'srv');
  const srvPath = path.join(genPath, 'srv');
  const csnJsonPath = path.join(srvPath, 'csn.json');

  if (fs.existsSync(csnJsonPath)) {
    return csnJsonPath;
  } else {
    throw new Error('csn.json not found in the expected path');
  }
}

// Function to parse the csn.json file
function parseCsnJson(csnJsonPath) {
  const csnData = JSON.parse(fs.readFileSync(csnJsonPath, 'utf-8'));
  return csnData;
}





// Function to copy the template folder (cap-table-maintainer-app) to the current directory
async function copyTemplateFolder() {
  const sourceDir = path.join(__dirname, 'template',  CTM_WEBAPP_NAME);
  const appDir = path.join(process.cwd(), 'app');  // Directory where we will copy the folder

  try {
    // Check if the "app" folder exists. If not, create it
    if (!fs.existsSync(appDir)) {
      await fsExtra.mkdir(appDir);  // Create the app directory
    }

    // Copy the cap-table-maintainer-app folder inside the "app" folder
    await fsExtra.copy(sourceDir, path.join(appDir, CTM_WEBAPP_NAME));

  } catch (error) {
    console.error('Error copying template folder:', error);
  }
}

// Function to generate ctm-metadata.json file
function generateMetadataJson(processedData) {
  const metadataPath = path.join(process.cwd(), CTM_METADATA_JSON_FILE_NAME);
  const jsonContent = JSON.stringify(processedData, null, 2);

  try {
    // Write to ctm-metadata.json
    fs.writeFileSync(metadataPath, jsonContent);
    console.log('Generated ctm-metadata.json successfully!');
    return metadataPath;  // Return the path to the generated file
  } catch (error) {
    console.error('Error generating ctm-metadata.json:', error);
    throw error;
  }
}

// Function to copy ctm-metadata.json to specified directories
async function copyMetadataJson(metadataPath) {
  const targetDirs = [
    path.join(process.cwd(), 'app', CTM_WEBAPP_NAME, 'webapp', 'ctm'),
    path.join(process.cwd(), 'app', CTM_WEBAPP_NAME, 'webapp', 'test', 'ctm')
  ];

  for (const dir of targetDirs) {
    try {
      // Ensure target directory exists
      await fsExtra.ensureDir(dir);
      // Copy the metadata file
      await fsExtra.copy(metadataPath, path.join(dir, CTM_METADATA_JSON_FILE_NAME));
    } catch (error) {
      console.error(`Error copying to ${dir}:`, error);
    }
  }
}


// Function to update the YAML backend section with services from JSON
async function updateYamlWithServices(jsonFilePath, yamlFilePath) {
  try {
    // Read JSON and YAML files
    const jsonData = await readJsonFile(jsonFilePath);
    const yamlObj = await readYamlFile(yamlFilePath);

    // Extract the services from JSON data
    const services = jsonData.services;

    // Find the backend section in the YAML object
    const backend = yamlObj.server.customMiddleware.find(mw => mw.name === 'fiori-tools-proxy')
      .configuration.backend;

    // Add the services to the backend array
    services.forEach(service => {
      backend.push({
        path: service.path,
        url: Constants.FIORI_LOCALHOST_RUNNING_URL // Static URL as per your example
      });
    });

    // Write the updated YAML back to the file
    await writeYamlFile(yamlFilePath, yamlObj);

  } catch (error) {
    console.error("Error updating YAML with services:", error);
  }
}

async function cleanUpDirectory() {
  const metadataPathAtRoot = path.join(process.cwd(), CTM_METADATA_JSON_FILE_NAME);
  fs.unlinkSync(metadataPathAtRoot);
}
  
  module.exports = {
    readJsonFile,
    readYamlFile,
    writeYamlFile,
    parseServiceNameToV4Endpoint,
    processCsnData,
    isJavaProject,
    isNodeProject,
    executeCommand,
    buildProject,
    updateYamlWithServices,
    copyMetadataJson,
    generateMetadataJson,
    copyTemplateFolder,
    parseCsnJson,
    findCsnJsonFile,
    cleanUpDirectory
  };