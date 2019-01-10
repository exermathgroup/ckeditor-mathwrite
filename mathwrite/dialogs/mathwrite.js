/**
 * Copyright (c) 2018 - Rafel Cortès. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * MathWrite plugin for CKEditor.
 *
 */

CKEDITOR.dialog.add( 'mathwrite', function( editor ) {
	var editNode = false;
	var iframeWindow = null;
	var xmlExpr = null;
	var widgetFocused = null;
	return {
		// Basic properties of the dialog window: title, minimum size.
		title: 'MathWrite dialog',
		minWidth: 600,
		minHeight: 400,

		// Dialog window content definition.
	    contents: [
	        {
	            id : 'iframe', label : '', title : '', expand : true, padding : 0,
	            elements: [
	                {
	                	type : 'iframe',
	                   	/*src : CKEDITOR.plugins.getPath(pluginName) + 'dialogs/mathwrite.html',*/
	                   	srcdoc : '<!doctype html><html><head><link rel="stylesheet" href="../guppy/guppy-default.min.css"><style>body {font-family: Arial, Helvetica, sans-serif;font-size: 1em;}#div-guppy {width: 100%;}.flex-container {display: flex;align-items: center;padding: 0.4em 0.2em;}</style><script src="../guppy/guppy.min.js"></script><script>window.onload = function() {Guppy.init({"path": "../guppy/","symbols": "../guppy/sym/symbols.json"});	myGuppy = new Guppy("div-guppy");}</script></head><body><div class="flex-container">Insert/Edit the mathematical expression:</div><div class="flex-container"><div id="div-guppy"></div></div></body></html>',
	                   	width : 600,
	                   	height : 400,
						onContentLoad : function() {
	                	   	var frameId = "iframe";
    	            	   	var iframe = document.getElementById( this._.frameId );
    	            	   	iframeWindow = iframe.contentWindow;
    	            	   	if (xmlExpr)
    	            	   		iframeWindow.myGuppy.engine.set_content(atob(xmlExpr));
						}                  	
	                },
	            ]
	        }
	    ],

	    onLoad: function() {
	    	// console.log('onLoad');
	    },


      	onShow: function() {
    	  // Detect if edit or new mode (if new create an empty element)
	    	// console.log('onShow');
	    	widgetFocused = editor.widgets.focused;
	    	if (widgetFocused && widgetFocused.name == 'mathwrite') {
	    		//iframeWindow.myGuppy.engine.set_content(atob(actFocused.data.xml));
	    		xmlExpr = widgetFocused.data.xml;
	    		editNode = true;
	    	} else {
	    		xmlExpr = null;
	    		editNode = false;
	    	}


      	},

		// This method is invoked once a user clicks the OK button, confirming the dialog.
		onOk: function() {
			// editor - "this" is now a CKEDITOR.dialog object.
			var ed = this.getParentEditor();
	        var latexExpr = iframeWindow.myGuppy.latex();
    	    xmlExpr = btoa(iframeWindow.myGuppy.xml());
			if (editNode) {
				widgetFocused.setData({math: '\\(' + latexExpr + '\\)', xml: xmlExpr});
			} else {
				ed.insertHtml('<span class="mathwrite" data-xml="' + xmlExpr + '">\\(' + latexExpr + '\\)</span>','unfiltered_html');
			}
		}
	};
});