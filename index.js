#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const fsExtra = require('fs-extra');  // Import fs-extra
const yaml = require('js-yaml');

const { readJsonFile, readYamlFile, writeYamlFile, parseServiceNameToV4Endpoint,
  processCsnData } = require('./utils/common');

// Main function to execute the complete process
async function main() {
  try {
    console.info("Starting CAP Table Maintainer (ctm) Build...")
    // Step 1: Build the project
    await buildProject();

    // Step 2: Find csn.json
    const csnJsonPath = findCsnJsonFile();

    // Step 3: Parse csn.json
    const csnData = parseCsnJson(csnJsonPath);

    // Step 4: Process the data and structure it
    let ctmMetadata = processCsnData(csnData);

    // Step 5: Generate the ctm-metadata.json file
    const metadataPath = generateMetadataJson(ctmMetadata);

    // Step 6: Copy the ctm-metadata.json to both webapp/ctm and webapp/test/ctm
    await copyMetadataJson(metadataPath);

    await copyTemplateFolder()


    // File paths
    const jsonFilePath = path.join(process.cwd(), 'app/cap-table-maintainer-app/webapp/ctm/ctm-metadata.json');
    const yamlFilePath = path.join(process.cwd(), 'app/cap-table-maintainer-app/ui5.yaml');

    await updateYamlWithServices(jsonFilePath, yamlFilePath);
    await cleanUpDirectory()

    console.log("CAP Table Maintenance Fiori App Generated Under folder app/cap-table-maintainer-app Successfully")

    console.info("Finished executing CAP Table Maintainer (ctm) Build...")

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main();



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
  const sourceDir = path.join(__dirname, 'template', 'cap-table-maintainer-app');
  const appDir = path.join(process.cwd(), 'app');  // Directory where we will copy the folder

  try {
    // Check if the "app" folder exists. If not, create it
    if (!fs.existsSync(appDir)) {
      await fsExtra.mkdir(appDir);  // Create the app directory
    }

    // Copy the cap-table-maintainer-app folder inside the "app" folder
    await fsExtra.copy(sourceDir, path.join(appDir, 'cap-table-maintainer-app'));

  } catch (error) {
    console.error('Error copying template folder:', error);
  }
}

// Function to generate ctm-metadata.json file
function generateMetadataJson(processedData) {
  const metadataPath = path.join(process.cwd(), 'ctm-metadata.json');
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
    path.join(process.cwd(), 'app', 'cap-table-maintainer-app', 'webapp', 'ctm'),
    path.join(process.cwd(), 'app', 'cap-table-maintainer-app', 'webapp', 'test', 'ctm')
  ];

  for (const dir of targetDirs) {
    try {
      // Ensure target directory exists
      await fsExtra.ensureDir(dir);
      // Copy the metadata file
      await fsExtra.copy(metadataPath, path.join(dir, 'ctm-metadata.json'));
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
        url: "http://localhost:4004"  // Static URL as per your example
      });
    });

    // Write the updated YAML back to the file
    await writeYamlFile(yamlFilePath, yamlObj);

  } catch (error) {
    console.error("Error updating YAML with services:", error);
  }
}

async function cleanUpDirectory() {
  const metadataPathAtRoot = path.join(process.cwd(), 'ctm-metadata.json');
  fs.unlinkSync(metadataPathAtRoot);
}

