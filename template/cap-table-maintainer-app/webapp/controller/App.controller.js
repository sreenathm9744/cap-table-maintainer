sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"

], (BaseController,JSONModel) => {
  "use strict";

  return BaseController.extend("captablemaintainerapp.controller.App", {
      onInit() {
      var oModel = new JSONModel( );
      oModel.loadData("ctm/ctm-metadata.json");
      this.getOwnerComponent().setModel(oModel, "ctmModel");
      }
  });
});