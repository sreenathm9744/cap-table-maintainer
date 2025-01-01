#!/usr/bin/env node

const path = require('path');

const {  
  processCsnData, buildProject, updateYamlWithServices, copyMetadataJson, generateMetadataJson, copyTemplateFolder,
  parseCsnJson, findCsnJsonFile, cleanUpDirectory } = require('./utils/Common');

const Constants = require('./utils/Constants');

// Main function to execute the complete process
async function main() {
  try {
    console.info("Starting CAP Table Maintainer (ctm) Build Process...")
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

    const jsonFilePath = path.join(process.cwd(), Constants.CTM_METADATA_DESTINATION_PATH1);
    const yamlFilePath = path.join(process.cwd(),  Constants.UI5_YAML_FILE_PATH);

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




