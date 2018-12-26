/**
 * Copyright (c) 2018 - Rafel Cortès. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * MathWrite plugin for CKEditor.
 *
 */
var pluginName = 'mathwrite';

var myGuppy;

// Register the plugin within the editor.
CKEDITOR.plugins.add( 'mathwrite', {
	requires: 'widget,iframedialog',

	// Register the icons.
	icons: 'mathwrite',

	// The plugin initialization logic goes inside this method.
	init: function( editor ) {

		// Register our dialog file -- this.path is the plugin folder path.
		CKEDITOR.dialog.add( 'mathwrite', this.path + 'dialogs/mathwrite.js' );		

		if ( !editor.config.mathJaxLib ) {
			CKEDITOR.error( 'mathjax-no-config' );
		}

		editor.widgets.add( 'mathwrite', {
		    // Code defined before...
		    inline: true,
		    dialog: 'mathwrite',
		    pathName: 'MathWrite',
		    mask: true,
		    button: 'MathWrite widget',
			allowedContent: 'span(!mathwrite)',

		    styleToAllowedContentRules: function( style ) {
		        // Retrieve classes defined in the style.
		        var classes = style.getClassesArray();
				if ( !classes )
					return null;
				classes.push( '!mathwrite' );
				return 'span(' + classes.join( ',' ) + ')';
		    },

		    template: '<span class="mathwrite" style="display:inline-block"></span>',

			parts: {
				span: 'span'
			},

		    init: function() {
				// In Firefox src must exist and be different than about:blank to emit load event.
				// In Chrome src must be undefined to emit load event.
				// jshint ignore:line
		    	var fixSrc = ( CKEDITOR.env.gecko ) ? 'javascript:true' : 'javascript:void(0)';

				var iframeWidget = this.parts.span.getChild( 0 );

				// Check if span contains iframe and create it otherwise.
				if ( !iframeWidget || iframeWidget.type != CKEDITOR.NODE_ELEMENT || !iframeWidget.is( 'iframe' ) ) {
					iframeWidget = new CKEDITOR.dom.element( 'iframe' );
					iframeWidget.setAttributes( {
						style: 'border:0;width:0;height:0',
						scrolling: 'no',
						frameborder: 0,
						allowTransparency: true,
						src: fixSrc
					} );
					this.parts.span.append( iframeWidget );
				}

				// Wait for ready because on some browsers iFrame will not
				// have document element until it is put into document.
				// This is a problem when you crate widget using dialog.
				this.once( 'ready', function() {
					this.frameWrapper = new CKEDITOR.plugins.mathwrite.frameWrapper( iframeWidget, editor );
					this.frameWrapper.setValue( this.data.math );
				} );				
		    },

			data: function() {
				if ( this.frameWrapper )
					this.frameWrapper.setValue( this.data.math );
			},

			upcast: function( el, data ) {
				if ( !( el.name == 'span' && el.hasClass( 'mathwrite' ) ) )
					return;

				if ( el.children.length > 1 || el.children[ 0 ].type != CKEDITOR.NODE_TEXT )
					return;

				data.math = CKEDITOR.tools.htmlDecode( el.children[ 0 ].value );

				// Add style display:inline-block to have proper height of widget wrapper and mask.
				var attrs = el.attributes;

				if ( attrs.style )
					attrs.style += ';display:inline-block';
				else
					attrs.style = 'display:inline-block';

				if ( attrs['data-xml'] ) 
					data.xml = attrs['data-xml'];

				// Add attribute to prevent deleting empty span in data processing.
				//attrs[ 'data-cke-survive' ] = 1;

				el.children[ 0 ].remove();

				return el;
			},

			downcast: function( el ) {
				el.children[ 0 ].replaceWith( new CKEDITOR.htmlParser.text( CKEDITOR.tools.htmlEncode( this.data.math ) ) );

				// Remove style display:inline-block.
				var attrs = el.attributes;
				attrs.style = attrs.style.replace( /display:\s?inline-block;?\s?/, '' );
				if ( attrs.style === '' )
					delete attrs.style;

				return el;
			}					    
		} );		

		// Define an editor command that opens our dialog window.
		editor.addCommand( 'mathwrite', new CKEDITOR.dialogCommand( 'mathwrite' ) );

		// Add MathJax script to page preview.
		editor.on( 'contentPreview', function( evt ) {
			evt.data.dataValue = evt.data.dataValue.replace(/<\/head>/,'<script src="' + CKEDITOR.getUrl( editor.config.mathJaxLib ) +
				'"><\/script>' + '<\/head>');
		} );

	}
});

/**
* @private
* @singleton
* @class CKEDITOR.plugins.mathjax
*/
CKEDITOR.plugins.mathwrite = {};


/**
 * Loading indicator image created by http://preloaders.net.
 */
CKEDITOR.plugins.mathwrite.loadingIcon = CKEDITOR.plugins.get( 'mathwrite' ).path + 'img/loader.gif';


/**
 * Computes predefined styles and copies them to another element.
 *
 * @private
 * @param {CKEDITOR.dom.element} from Copy source.
 * @param {CKEDITOR.dom.element} to Copy target.
 */
CKEDITOR.plugins.mathwrite.copyStyles = function( from, to ) {
	var stylesToCopy = [ 'color', 'font-family', 'font-style', 'font-weight', 'font-variant', 'font-size' ];

	for ( var i = 0; i < stylesToCopy.length; i++ ) {
		var key = stylesToCopy[ i ],
			val = from.getComputedStyle( key );
		if ( val )
			to.setStyle( key, val );
	}
};



CKEDITOR.plugins.mathwrite.frameWrapper = function( iFrame, editor ) {

	var buffer, preview, value, newValue,
	doc = iFrame.getFrameDocument(),

	// Is MathJax loaded and ready to work.
	isInit = false,

	// Is MathJax parsing Tex.
	isRunning = false,

	// Function called when MathJax is loaded.
	loadedHandler = CKEDITOR.tools.addFunction( function() {
		preview = doc.getById( 'preview' );
		buffer = doc.getById( 'buffer' );
		isInit = true;

		if ( newValue )
			update();

		// Private! For test usage only.
		//CKEDITOR.fire( 'mathJaxLoaded', iFrame );
	} ),

	// Function called when MathJax finish his job.
	updateDoneHandler = CKEDITOR.tools.addFunction( function() {
		CKEDITOR.plugins.mathwrite.copyStyles( iFrame, preview );

		preview.setHtml( buffer.getHtml() );

		editor.fire( 'lockSnapshot' );

		iFrame.setStyles( {
			height: 0,
			width: 0
		} );

		// Set iFrame dimensions.
		var height = Math.max( doc.$.body.offsetHeight, doc.$.documentElement.offsetHeight ),
			width = Math.max( preview.$.offsetWidth, doc.$.body.scrollWidth );

		iFrame.setStyles( {
			height: height + 'px',
			width: width + 'px'
		} );

		editor.fire( 'unlockSnapshot' );

		// Private! For test usage only.
		//CKEDITOR.fire( 'mathJaxUpdateDone', iFrame );

		// If value changed in the meantime update it again.
		if ( value != newValue )
			update();
		else
			isRunning = false;
	} );

	iFrame.on( 'load', load );

	load();

	function load() {
		doc = iFrame.getFrameDocument();

		if ( doc.getById( 'preview' ) )
			return;

		doc.write( '<!DOCTYPE html>' +
					'<html>' +
					'<head>' +
						'<meta charset="utf-8">' +
						'<script type="text/x-mathjax-config">' +

							// MathJax configuration, disable messages.
							'MathJax.Hub.Config( {' +
								'showMathMenu: false,' +
								'messageStyle: "none"' +
							'} );' +

							// Get main CKEDITOR form parent.
							'function getCKE() {' +
								'if ( typeof window.parent.CKEDITOR == \'object\' ) {' +
									'return window.parent.CKEDITOR;' +
								'} else {' +
									'return window.parent.parent.CKEDITOR;' +
								'}' +
							'}' +

							// Run MathJax.Hub with its actual parser and call callback function after that.
							// Because MathJax.Hub is asynchronous create MathJax.Hub.Queue to wait with callback.
							'function update() {' +
								'MathJax.Hub.Queue(' +
									'[ \'Typeset\', MathJax.Hub, this.buffer ],' +
									'function() {' +
										'getCKE().tools.callFunction( ' + updateDoneHandler + ' );' +
									'}' +
								');' +
							'}' +

							// Run MathJax for the first time, when the script is loaded.
							// Callback function will be called then it's done.
							'MathJax.Hub.Queue( function() {' +
								'getCKE().tools.callFunction(' + loadedHandler + ');' +
							'} );' +
						'</script>' +

						// Load MathJax lib.
						'<script src="' + ( editor.config.mathJaxLib ) + '"></script>' +
					'</head>' +
					'<body style="padding:0;margin:0;background:transparent;overflow:hidden">' +
						'<span id="preview"></span>' +

						// Render everything here and after that copy it to the preview.
						'<span id="buffer" style="display:none"></span>' +
					'</body>' +
					'</html>' );
	}

	// Run MathJax parsing Tex.
	function update() {
		isRunning = true;

		value = newValue;

		editor.fire( 'lockSnapshot' );

		buffer.setHtml( value );

		// Set loading indicator.
		preview.setHtml( '<img src=' + CKEDITOR.plugins.mathwrite.loadingIcon + ' alt=' + 'loading...' + '>' );

		iFrame.setStyles( {
			height: '16px',
			width: '16px',
			display: 'inline',
			'vertical-align': 'middle'
		} );

		editor.fire( 'unlockSnapshot' );

		// Run MathJax.
		doc.getWindow().$.update( value );
	}

	return {
		/**
		 * Sets the TeX value to be displayed in the `iframe` element inside
		 * the editor. This function will activate the MathJax
		 * library which interprets TeX expressions and converts them into
		 * their representation that is displayed in the editor.
		 *
		 * @param {String} value TeX string.
		 */
		setValue: function( value ) {
			newValue = CKEDITOR.tools.htmlEncode( value );

			if ( isInit && !isRunning )
				update();
		}
	};
};

/**
 * Sets the path to the MathJax library. It can be both a local resource and a location different than the default CDN.
 *
 * Please note that this must be a full or absolute path.
 *
 * Read more in the {@glink guide/dev_mathjax documentation}
 * and see the [SDK sample](https://sdk.ckeditor.com/samples/mathjax.html).
 */

CKEDITOR.config.mathJaxLib = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/MathJax.js?config=TeX-AMS_HTML';
 
 /*
 * **Note:** Since CKEditor 4.5 this option does not have a default value, so it must
 * be set in order to enable the MathJax plugin.
 *
 * @since 4.3
 * @cfg {String} mathJaxLib
 * @member CKEDITOR.config
 */
