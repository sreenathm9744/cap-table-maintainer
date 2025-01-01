# cap-table-maintainer

A CLI tool for automatically generating a Table Maintenance Fiori app for SAP CAP (Cloud Application Programming) projects.

## Overview

`cap-table-maintainer` is a Node.js command-line interface (CLI) tool designed to streamline the process of building a Table Maintenance Fiori app for SAP CAP applications. SAP CAP applications, when built with OData V4 and freestyle UI5, typically lack an out-of-the-box solution for table maintenance. This tool solves that problem by automatically generating a fully functional Table Maintenance UI5 app for managing data in your tables of your SAP CAP Project.

## Features

- **Automatic Table Maintenance App Generation**: Automatically generates a Fiori-based table maintenance app for your SAP CAP tables.


## Installation

To install the `cap-table-maintainer` package, run the following command:

```bash
npm install -g cap-table-maintainer
```
### Usage
- Navigate to the root folder of your SAP CAP project.
- Run the following command:
```bash
ctm build
```
- After running the command, the Table Maintenance Fiori app will be generated automatically under your app folder.
- You can run generated fiori app by executing npm start

Example

```bash
Copy code
$ npm install -g cap-table-maintainer
$ cd path/to/your/cap/project
$ ctm build
```
This will generate a table maintenance Fiori app that you can immediately use to manage the tables in your SAP CAP application.

### How It Works
When you run ctm build, the tool reads the entities defined in your CAP model (either CDS or YAML), and based on these entities, it generates a corresponding Fiori UI5 app with CRUD (Create, Read, Update, Delete) functionality for each table. 

The generated app is placed in your app folder and can be directly integrated into your CAP project.

#### Requirements
- Node.js (version >= 14.x)
- SAP CAP Project with OData V4 service (As of now, the ctm works with odata v4 only)
 
### Contributing
Feel free to fork, open issues, or submit pull requests to help improve the project!

- Fork the repository.
- Create a feature branch (git checkout -b feature-name).
- Commit your changes (git commit -m 'Add new feature').
- Push to the branch (git push origin feature-name).
- Open a pull request.

### License
MIT License.  