sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/BindingMode",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
], function (Controller, ODataModel, BindingMode,
    MessageToast, MessageBox, JSONModel, Sorter, Filter, FilterOperator, FilterType) {
    "use strict";

    return Controller.extend("captablemaintainerapp.controller.View1", {

        onInit: async function () {
            var oMessageManager = sap.ui.getCore().getMessageManager(),
                oMessageModel = oMessageManager.getMessageModel(),
                oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
                    new Filter("technical", FilterOperator.EQ, true)),
                oViewModel = new JSONModel({
                    busy: false,
                    hasUIChanges: false,
                    selectedTable: ""
                });
            this.getView().setModel(oViewModel, "appView");
            this.getView().setModel(oMessageModel, "message");

            oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
            this._bTechnicalErrors = false;
        },

        onTableSetPress: async function () {
            const ctmModel = this.getOwnerComponent().getModel("ctmModel");
            const ctmModelData = ctmModel.getData()
            const sService = this.getView().byId("services").getSelectedItem().getKey();
            const sEntity = this.getView().byId("entities").getSelectedItem().getKey();
         
           const oService=  ctmModelData.services.find(oData=> oData.name == sService)
            const sServiceUrl = oService.path;

            this.oSelectedEntity = {
                'serviceName': sService + "." + sEntity,
                'entityName': sEntity,
                'serviceUrl': sServiceUrl

            }
            this.aSelectedEntityKeys = [];
            this.aSelectedEntityProperties = [];             

            // Create the OData V4 Model
            var oModel = new ODataModel({
                serviceUrl: sServiceUrl,
                synchronizationMode: "None" 
                
            });

            var oComponent = this.getOwnerComponent();
            oComponent.setModel(oModel);
            await this._loadMetadata();
            var oModel = this.getView().getModel("appView");
            oModel.setProperty("/selectedTable", this.oSelectedEntity.serviceName);
        },

        _loadMetadata: async function () {
            var oModel = this.getOwnerComponent().getModel();
            var oMetaModel = oModel.getMetaModel();

            try {
                // Request metadata data
                await oMetaModel.requestData();
                var oMetadata = oMetaModel.getData();

                // Process the metadata and create the table dynamically
                const sSelectedService = this.oSelectedEntity.serviceName;
                var oEntityType = oMetadata[sSelectedService];  // Adjust this based on the metadata structure
                this._createTableColumns(oEntityType);
                this._bindTableData(oEntityType);
            } catch (e) {
                MessageToast.show("Error loading metadata: " + e.message);
            }
        },

        // Create table columns dynamically based on OData metadata
        _createTableColumns: function (oEntityType) {
            var oTable = this.byId("dynamicTable");

            // Clear existing columns
            oTable.removeAllColumns();
            this.aSelectedEntityKeys = oEntityType['$Key'];
            this.aSelectedEntityProperties = [];
            const that = this;
            // Loop through the properties in the entity and create columns dynamically
            Object.keys(oEntityType).forEach(function (property) {
                if (oEntityType[property].$kind === "Property") {
                    var oColumn = new sap.m.Column({
                        header: new sap.m.Text({ text: property })
                    });
                    oTable.addColumn(oColumn);
                    that.aSelectedEntityProperties.push(property);
                }
            });
        },

        // Bind the table to the OData entity set
        _bindTableData: function (oEntityType) {
            var oTable = this.byId("dynamicTable");

            // Define the path to the entity set
            var sEntitySet = "/" + this.oSelectedEntity.entityName; // Adjust this based on the metadata

            // Create template for rows (ColumnListItem)
            var oTemplate = new sap.m.ColumnListItem({
                cells: Object.keys(oEntityType).filter(function (property) {
                    return oEntityType[property].$kind === "Property";
                }).map(function (property) {
                    return new sap.m.Input({
                        value: "{" + property + "}", // Binding each property dynamically
                        editable: true, // Make each cell editable
                        liveChange: this.onInputChange.bind(this) // Optional: Update model during live editing
                    });
                }.bind(this))
            });

            console.log("Binding path: ", sEntitySet);

            // Bind the table rows using the correct entity set
            oTable.bindItems({
                path: sEntitySet, // Binding to the OData entity set
                template: oTemplate,
                parameters: {
                    $count: true,
                    $$updateGroupId: 'saveBatch',
                    $$operationMode: 'Server',
                    // $expand: "author", // Optional: Expand navigation properties (e.g., "author" relation)
                    $select: Object.keys(oEntityType).filter(function (property) {
                        return oEntityType[property].$kind === "Property";
                    }).join(",") // Select only the properties
                },
                events: {
                    dataReceived: function (oEvent) {
                        
                    }
                }
            });
        },

        onRefresh: function () {
            var oBinding = this.byId("dynamicTable").getBinding("items");

            if (oBinding.hasPendingChanges()) {
                MessageBox.error(this._getText("refreshNotPossibleMessage"));
                return;
            }
            oBinding.refresh();
            MessageToast.show(this._getText("refreshSuccessMessage"));
        },

        _getText: function (sTextId, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);

        },


        onSearch: function () {
            var oView = this.getView(),
                sValue = oView.byId("searchField").getValue();
            const aFilters = [];

            this.aSelectedEntityProperties.forEach((sProperty)=>{
               const oFilter = new Filter(sProperty, FilterOperator.Contains, sValue);
               aFilters.push(oFilter);
            })
            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: false  
            });
            oView.byId("dynamicTable").getBinding("items").filter(oCombinedFilter,FilterType.Application);
        },

        onSort: function () {

        },

        _setUIChanges: function (bHasUIChanges) {
            if (this._bTechnicalErrors) {
                // If there is currently a technical error, then force 'true'.
                bHasUIChanges = true;
            } else if (bHasUIChanges === undefined) {
                bHasUIChanges = this.getView().getModel().hasPendingChanges();
            }
            var oModel = this.getView().getModel("appView");
            oModel.setProperty("/hasUIChanges", bHasUIChanges);
        },
        onCreate: function () {
            const aEntityProperties = this.aSelectedEntityProperties
            const oDummyObject = aEntityProperties.reduce((obj, key) => {
                obj[key] = '';
                return obj;
            }, {});
            var oList = this.byId("dynamicTable"),
                oBinding = oList.getBinding("items"),
                oContext = oBinding.create(oDummyObject);

            this._setUIChanges();

            oList.getItems().some(function (oItem) {
                if (oItem.getBindingContext() === oContext) {
                    oItem.focus();
                    oItem.setSelected(true);
                    return true;
                }
            });
        },

        onSave: function () {
            var fnSuccess = function () {
                this._setBusy(false);
                MessageToast.show(this._getText("changesSentMessage"));
                this._setUIChanges(false);
            }.bind(this);

            var fnError = function (oError) {
                this._setBusy(false);
                this._setUIChanges(false);
                MessageBox.error(oError.message);
            }.bind(this);

            this._setBusy(true); // Lock UI until submitBatch is resolved.
            this.getView().getModel().submitBatch("saveBatch").then(fnSuccess, fnError);
            this._bTechnicalErrors = false; // If there were technical errors, a new save resets them.
        },
        onDelete: function () {
            var oContext,
                oSelected = this.byId("dynamicTable").getSelectedItem(),
                sPath;

            if (oSelected) {
                oContext = oSelected.getBindingContext();
                sPath = oContext.getPath();
                oContext.delete().then(function () {
                    MessageToast.show(this._getText("deletionSuccessMessage", sPath));
                }.bind(this), function (oError) {
                    this._setUIChanges();
                    if (oError.canceled) {
                        MessageToast.show(this._getText("deletionRestoredMessage", sPath));
                        return;
                    }
                    MessageBox.error(oError.message + ": " + sPath);
                }.bind(this));
                this._setUIChanges(true);
            }
        },
        _setBusy: function (bIsBusy) {
            var oModel = this.getView().getModel("appView");
            oModel.setProperty("/busy", bIsBusy);
        },
        onMessageBindingChange: function (oEvent) {
            var aContexts = oEvent.getSource().getContexts(),
                aMessages,
                bMessageOpen = false;

            if (bMessageOpen || !aContexts.length) {
                return;
            }

            // Extract and remove the technical messages
            aMessages = aContexts.map(function (oContext) {
                return oContext.getObject();
            });
            sap.ui.getCore().getMessageManager().removeMessages(aMessages);

            this._setUIChanges(true);
            this._bTechnicalErrors = true;
            MessageBox.error(aMessages[0].message, {
                id: "serviceErrorMessageBox",
                onClose: function () {
                    bMessageOpen = false;
                }
            });

            bMessageOpen = true;
        },
        onResetChanges: function () {
            this.byId("dynamicTable").getBinding("items").resetChanges();
            this._bTechnicalErrors = false;
            this._setUIChanges();
        },
        onInputChange: function (oEvt) {
            if (oEvt.getParameter("escPressed")) {
                this._setUIChanges();
            } else {
                this._setUIChanges(true);
            }
        },


        // Event handler for the services dropdown selection change
        onServicesDropdown: function (oEvent) {
            var sSelectedService = oEvent.getParameter("selectedItem").getKey();

            var oSelect = this.getView().byId("entities");
            var oBinding = oSelect.getBinding("items");

            var oFilter = new sap.ui.model.Filter("service", sap.ui.model.FilterOperator.EQ, sSelectedService);
            oBinding.filter(oFilter);
        }

    });
});
