(function() {
	var ui = {};

	//==================================================================================================================
	//  [Utility]
	//==================================================================================================================		
	ui.createNodeFromHTML = function(html) {
		var template = document.createElement('template');
		template.innerHTML = html;
		return template.content.childNodes[0];
	};
	
	ui.removeNode = function(node) {
		node.parentNode.removeChild(node);
	};
	
	ui.bindEvent = function(node, eventName, selector, handler) {
		node.addEventListener(eventName, function(event) {
			var target = event.target;
			if (target.matches(selector)) {
				handler.call(target, event);
			}
			else {
				target = event.target.closest(selector);
				if (target)
					handler.call(target, event);
			}
		});
	};
	
	ui.ensureRange = function(value, minValue, maxValue) {
		if (value < minValue)
			return minValue;
		if (value > maxValue)
			return maxValue;
		return value;
	};
	//==================================================================================================================
	//  END OF: [Utility]
	//==================================================================================================================
	
	//==================================================================================================================
	//  [Popup]
	//==================================================================================================================
	(function() {
		var popupList = [];

		document.addEventListener('mousedown', mouseDownHandler);
		document.addEventListener('click', clickHandler);

		function mouseDownHandler(event) {
			// Check if we are on vertical scroll bar
			if (event.target == document.documentElement && event.pageX > document.documentElement.clientWidth)
				return;

			tryClosePopups(event.target, false);
		}

		function clickHandler(event) {
			tryClosePopups(event.target, true);
		}

		function addPopup(node, uiExclude, callback, closeOnClick) {
			// Removing previous close handler for this element
			removePopup(node);

			uiExclude.push(node);

			// Adding popup close handler to popup list
			popupList.push({
				'node': node,
				'uiExclude': uiExclude,
				'callback': callback,
				'closeOnClick': !!closeOnClick
			});
		}

		function removePopup(node) {
			var newPopupList = [];
			for (var i = 0; i < popupList.length; i++) {
				var popup = popupList[i];
				if (popup['node'] != node)
					newPopupList.push(popup);
			}
			popupList = newPopupList;
		}

		function releasePopup(popup) {
			var callback = popup['callback'];
			if (callback)
				callback();
		}

		function closeAllPopups() {
			for (var i = 0, n = popupList.length; i < n; i++)
				releasePopup(popupList[i]);
			popupList = [];
		}
		
		function hasClosestNode(node, parentNode) {
			for (;;) {
				if (!node)
					return false;

				if (node == parentNode)
					return true;

				node = node.parentNode;
			}
		}

		function checkForExclude(target, uiExclude) {
			for (var i = 0; i < uiExclude.length; i++) {
				var excludeSelector = uiExclude[i];
				if (typeof target == 'string') {
					if (target.matches(excludeSelector) || target.closest(excludeSelector))
						return true;
				}
				else if (hasClosestNode(target, excludeSelector)) {
					return true;
				}
			}
			return false;
		}

		function checkIfWeAreOnChildPopup(popup, popupIndex, target) {
			for (var i = popupIndex + 1; i < popupList.length; i++) {
				var nextPopup = popupList[i];

				if (target == nextPopup.node || hasClosestNode(target, nextPopup.node))
					return true;

				if (checkForExclude(target, popup['uiExclude']))
					return true;
			}
			return false;
		}

		function tryClosePopups(target, closeOnClick) {
			// Check if element was not deleted before we get an event from it
			if (!target.parentNode || !target.ownerDocument)
				return;

			// Hiding popups
			var newPopupList = [];
			for (var i = 0, n = popupList.length; i < n; i++) {
				var popup = popupList[i];

				// Check if this popup could be hidden right now it by valid method
				if (popup['closeOnClick'] != closeOnClick) {
					newPopupList.push(popup);
					continue;
				}

				// If we are on child popup than we can't hide its parent
				if (checkIfWeAreOnChildPopup(popup, i, target)) {
					newPopupList.push(popup);
					continue;
				}

				// If we not excluded it from hiding
				if (checkForExclude(target, popup['uiExclude'])) {
					newPopupList.push(popup);
					continue;
				}

				// Hiding popup
				releasePopup(popup);
			}

			popupList = newPopupList;
		}

		ui.addPopup = addPopup;
		ui.removePopup = removePopup;
		ui.closeAllPopups = closeAllPopups;
	})();
	//==================================================================================================================
	//  END OF: [Popup]
	//==================================================================================================================
	
	//==================================================================================================================
	//	[Drag & drop]
	//==================================================================================================================
	(function() {
		var mouseDraggingInitialized = false;
		var mouseDragInstance = null;
		var touchDragInstance = null;

		function start(instance) {
			var originalEvent = instance['event']['originalEvent'] || instance['event'];
			instance['isTouchDragging'] = !!(originalEvent['touches']);

			if (instance['isTouchDragging'])
				startTouchDragging(instance);
			else
				startMouseDragging(instance);
		}

		function initializeMouseDragging() {
			if (mouseDraggingInitialized)
				return;

			document.addEventListener('mousemove', function(event) {
				if (mouseDragInstance && mouseDragInstance.processDragging) {
					mouseDragInstance['pageX'] = event.pageX;
					mouseDragInstance['pageY'] = event.pageY;
					mouseDragInstance.processDragging(mouseDragInstance);
				}
			});

			document.addEventListener('mouseup', function(event) {
				if (mouseDragInstance) {
					if (mouseDragInstance.finishOnClick) {
						mouseDragInstance['pageX'] = event.pageX;
						mouseDragInstance['pageY'] = event.pageY;
						return;
					}

					if (mouseDragInstance.stopDragging) {
						mouseDragInstance['pageX'] = event.pageX;
						mouseDragInstance['pageY'] = event.pageY;
						mouseDragInstance.stopDragging(mouseDragInstance);
					}

					var node = mouseDragInstance['_overlayNode'];
					node.parentNode.removeChild(node);
					mouseDragInstance = null;
				}
			});

			mouseDraggingInitialized = true;
		}

		function startMouseDragging(instance) {
			var event = instance['event'];

			if (mouseDragInstance)
				return;

			if (event.which != 1)
				return;

			event.preventDefault();
			delete instance['event'];

			initializeMouseDragging();
			mouseDragInstance = instance;

			var overlayNode = document.createElement('DIV');
			overlayNode.setAttribute('class', 'ui-drag-n-drop-overlay');
			overlayNode.setAttribute('style', 'position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 9999; cursor: move; cursor: grab;');
			document.body.appendChild(overlayNode);
			instance['_overlayNode'] = overlayNode;

			overlayNode.addEventListener('mousedown', function (event) {
				event.preventDefault();
				event.stopPropagation();
			});

			if (instance.hasOwnProperty('cursor'))
				overlayNode.style['cursor'] = instance['cursor'];

			if (instance.startDragging) {
				instance['pageX'] = event.pageX;
				instance['pageY'] = event.pageY;
				instance.startDragging(instance);
			}
		}

		function startTouchDragging(instance) {
			if (touchDragInstance)
				return;

			var event = instance['event'];
			event.preventDefault();
			delete instance['event'];
			touchDragInstance = instance;

			var ownerNode = instance['owner'];
			ownerNode.addEventListener('touchmove', touchMove);
			ownerNode.addEventListener('touchend', touchEnd);

			instance['pageX'] = event.touches[0].pageX;
			instance['pageY'] = event.touches[0].pageY;
			if (instance.startDragging)
				instance.startDragging(instance);

			function touchMove(event) {
				if (event.touches.length != 1)
					return;

				instance['pageX'] = event.touches[0].pageX;
				instance['pageY'] = event.touches[0].pageY;
				if (instance.processDragging)
					instance.processDragging(instance);
			}

			function touchEnd() {
				if (instance.stopDragging)
					instance.stopDragging(instance);

				ownerNode.removeEventListener('touchmove', touchMove);
				ownerNode.removeEventListener('touchend', touchEnd);
				touchDragInstance = null;
			}
		}

		ui.dragAndDrop = start;
	})();
	//==================================================================================================================
	//	END OF: [Drag & drop]
	//==================================================================================================================
	
	//==================================================================================================================
	//	[Bitmap]
	//==================================================================================================================
	function Bitmap() {
		var bitmap = {};
		bitmap.width = 0;
		bitmap.height = 0;
		bitmap.r = [];
		bitmap.g = [];
		bitmap.b = [];
		return bitmap;
	}

	function bitmap_setSize(bitmap, w, h) {
		bitmap.width = w;
		bitmap.height = h;

		var r = [];
		var g = [];
		var b = [];
		for (var y = 0; y < h; y++) {
			r.push(new Uint8Array(w));
			g.push(new Uint8Array(w));
			b.push(new Uint8Array(w));
		}
		bitmap.r = r;
		bitmap.g = g;
		bitmap.b = b;
	}

	function bitmap_loadFromFile(bitmap, src, onLoad) {
		var img = new Image();
		img.onload = function () {
			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext('2d');

			var w = img.naturalWidth;
			var h = img.naturalHeight;
			bitmap.width = w;
			bitmap.height = h;
			canvas.width = w;
			canvas.height = h;
			ctx.drawImage(img, 0, 0);

			bitmap_setSize(bitmap, w, h);
			var data = ctx.getImageData(0, 0, w, h).data;
			for (var y = 0; y < h; y++) {
				var offs = y * w * 4;
				for (var x = 0; x < w; x++) {
					bitmap.r[y][x] = data[offs];
					bitmap.g[y][x] = data[offs + 1];
					bitmap.b[y][x] = data[offs + 2];
					offs += 4;
				}
			}

			setTimeout(function () {
				if (onLoad)
					onLoad();
			}, 1);
		}
		img.src = src;
	}

	function bitmap_displayTo(bitmap, canvas) {
		var w = bitmap.width;
		var h = bitmap.height;
		canvas.width = w;
		canvas.height = h;

		var ctx = canvas.getContext('2d');
		var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var buffer = image.data;
		var offs = 0;
		for (var y = 0; y < h; y++) {
			for (var x = 0; x < w; x++) {
				buffer[offs] = bitmap.r[y][x];
				buffer[offs + 1] = bitmap.g[y][x];
				buffer[offs + 2] = bitmap.b[y][x];
				buffer[offs + 3] = 255;
				offs += 4;
			}
		}
		ctx.putImageData(image, 0, 0);
	}
	//==================================================================================================================
	//	END OF: [Bitmap]
	//==================================================================================================================
	
	//==================================================================================================================
	//	[Zoom Calculator]
	//==================================================================================================================
	var minZoomValue = 10;
	var maxZoomValue = 400;
	var zoomCalculator = {};
	(function(plugin) {
		var zoomTable;
		var zoomIncrementTable;
		init();

		function init() {
			var i, v;

			// Building zoom table
			zoomTable = [];
			for (i = 0;; i++) {
				v = Math.floor(Math.pow(10, i / 99.9));
				if (v < minZoomValue)
					continue;
				if (v > maxZoomValue)
					break;

				zoomTable.push(v);
			}

			// Building zoom increments table
			zoomIncrementTable = [];
			for (i = 0;; i++) {
				v = Math.floor(Math.pow(10, (i + 0.05) / 20));
				if (v < minZoomValue)
					continue;
				if (v > maxZoomValue)
					break;

				zoomIncrementTable.push(v);
			}
		}

		function zoom2exp(value) {
			if (value < minZoomValue)
				value = minZoomValue;
			if (value > maxZoomValue)
				value = maxZoomValue;
			return zoomTable[Math.floor((value - minZoomValue) / (maxZoomValue - minZoomValue) * (zoomTable.length - 1))];
		}

		function exp2zoom(exp) {
			for (var i = 0; i < zoomTable.length; i++) {
				if (exp <= zoomTable[i])
					return i / (zoomTable.length - 1) * (maxZoomValue - minZoomValue) + minZoomValue;
			}
			return minZoomValue;
		}

		function calcZoomIn(value) {
			for (var i = 0; i < zoomIncrementTable.length; i++) {
				var currZoom = zoomIncrementTable[i];
				if (currZoom > value)
					return currZoom;
			}
			return maxZoomValue;
		}

		function calcZoomOut(value) {
			for (var i = zoomIncrementTable.length - 1; i >= 0; i--) {
				var currZoom = zoomIncrementTable[i];
				if (currZoom < value)
					return currZoom;
			}
			return minZoomValue;
		}

		plugin.zoom2exp = zoom2exp;
		plugin.exp2zoom = exp2zoom;
		plugin.calcZoomIn = calcZoomIn;
		plugin.calcZoomOut = calcZoomOut;
	})(zoomCalculator);
	//==================================================================================================================
	//	END OF: [Zoom Calculator]
	//==================================================================================================================
	
	//==================================================================================================================
	//  [Photo Viewer]
	//==================================================================================================================
	var srcBitmap = Bitmap();
	
	ui.photoViewer = {};
	(function(plugin) {
		var initialized = false;
		var viewerVisible = false;
		var viewerNode;
		var canvasNode;
		var nextButtonNode;
		var prevButtonNode;
		var onSwitchNext;
		var onSwitchPrevious;
		var isBusy = false;
		
		function init() {
			if (initialized)
				return;
			
			viewerNode = document.querySelector('.ra-photo-viewer');
			canvasNode = viewerNode.querySelector('.ra-photo-viewer-canvas');
			nextButtonNode = viewerNode.querySelector('.ra-photo-viewer-next-button');
			prevButtonNode = viewerNode.querySelector('.ra-photo-viewer-prev-button');
			
			ui.photoViewerScrollArea.init(viewerNode);
			ui.photoViewerZoomPanel.init(viewerNode);
			ui.photoViewerKeyboardShortcuts.init(viewerNode);
			
			nextButtonNode.addEventListener('click', function() {
				switchToNextPhoto();
			});
			
			prevButtonNode.addEventListener('click', function() {
				switchToPreviousPhoto();
			});
			
			viewerNode.querySelector('.ra-photo-viewer-scroll-box').addEventListener('click', function(event) {
				if (event.target == this)
					close();
			});
			
			viewerNode.querySelector('.ra-photo-viewer-close-button').addEventListener('click', function() {
				close();
			});
			
			window.addEventListener('resize', function() {
				ui.photoViewerScrollArea.adjust();
			});
			
			initialized = true;
		}
		
		function display(options) {
			onSwitchNext = options['onSwitchNext'];
			onSwitchPrevious = options['onSwitchPrevious'];
			onCanSwitchNext = options['onCanSwitchNext'];
			onCanSwitchPrevious = options['onCanSwitchPrevious'];
			
			init();
			
			if (viewerVisible)
				return;
			
			loadImage(options['imageURL']);
		}
		
		function loadImage(imageURL) {
			isBusy = true;
			bitmap_loadFromFile(srcBitmap, imageURL, function() {
				isBusy = false;
				bitmap_displayTo(srcBitmap, canvasNode);
				
				// Displaying viewer				
				viewerNode.style['display'] = 'block';
				ui.photoViewerKeyboardShortcuts.activate();
				viewerVisible = true;
				setTimeout(function() {
					viewerNode.classList.add('ra-photo-viewer-visible');
				}, 1);
				
				ui.photoViewerScrollArea.zoomToFitImage();
				updateSwitchState();
			});
		}
		
		function close() {
			if (!viewerVisible)
				return;
			
			ui.photoViewerKeyboardShortcuts.deactivate();
			viewerNode.classList.remove('ra-photo-viewer-visible');
			viewerVisible = false;
			
			setTimeout(function() {
				viewerNode.style['display'] = 'none';
			}, 300);
		}
		
		function setZoom(value) {
			ui.photoViewerScrollArea.setZoom(value, true);
		}
		
		function updateSwitchState() {
			viewerNode.querySelector('.ra-photo-viewer-next-button').classList.toggle('ra-disabled', !onCanSwitchNext());
			viewerNode.querySelector('.ra-photo-viewer-prev-button').classList.toggle('ra-disabled', !onCanSwitchPrevious());
		}
		
		function switchToNextPhoto() {
			if (nextButtonNode.classList.contains('ra-disabled') || isBusy)
				return;
			
			onSwitchNext(function(imageURL) {
				loadImage(imageURL);
			});
		}
		
		function switchToPreviousPhoto() {
			if (prevButtonNode.classList.contains('ra-disabled') || isBusy)
				return;
			
			onSwitchPrevious(function(imageURL) {
				loadImage(imageURL);
			});
		}
		
		function zoomIn() {
			ui.photoViewerScrollArea.zoomIn();
		}
		
		function zoomOut() {
			ui.photoViewerScrollArea.zoomOut();
		}
		
		plugin.display = display;
		plugin.close = close;
		plugin.setZoom = setZoom;
		plugin.switchToNextPhoto = switchToNextPhoto;
		plugin.switchToPreviousPhoto = switchToPreviousPhoto;
		plugin.zoomIn = zoomIn;
		plugin.zoomOut = zoomOut;
	})(ui.photoViewer);
	//==================================================================================================================
	//  END OF: [Photo Viewer]
	//==================================================================================================================
	
	//==================================================================================================================
	//  [Photo Viewer > Scroll Area]
	//==================================================================================================================
	ui.photoViewerScrollArea = {};
	(function(plugin) {
		var viewerNode;
		var scrollBoxNode;
		var contentNode;
		var imageNode;
		var zoomLabelNode;
		var hRailNode;
		var hBarNode;
		var vRailNode;
		var vBarNode;
		var zoom = 100;
		var zoomFactor = 1;
		var zoomX = 0;
		var zoomY = 0;
		var padding = 32;
		var padding2 = padding * 2;
		var contentLeft = 0;
		var contentTop = 0;
		var destWidth;
		var destHeight;
		var oldWidth = 1;
		var oldHeight = 1;
		
		function init(ownerNode) {
			viewerNode = ownerNode;
			
			scrollBoxNode = document.querySelector('.ra-photo-viewer-scroll-box');
			contentNode = viewerNode.querySelector('.ra-photo-viewer-content');
			imageNode = viewerNode.querySelector('.ra-photo-viewer-image');
			zoomLabelNode = viewerNode.querySelector('.ra-photo-viewer-zoom-panel-percentage-label');
			hRailNode = viewerNode.querySelector('.ra-photo-viewer-h-scroll-rail');
			hBarNode = viewerNode.querySelector('.ra-photo-viewer-h-scroll-bar');
			vRailNode = viewerNode.querySelector('.ra-photo-viewer-v-scroll-rail');
			vBarNode = viewerNode.querySelector('.ra-photo-viewer-v-scroll-bar');
			
			// Processing mouse move event
			scrollBoxNode.addEventListener('mousemove', function(event) {
				zoomX = event.pageX - window.pageXOffset;
				zoomY = event.pageY - window.pageYOffset;
			});
			
			// Processing mouse wheel event
			scrollBoxNode.addEventListener('mousewheel', function(event) {
				event.preventDefault();
				if (event['deltaY'] < 0)
					setZoom(zoomCalculator.calcZoomIn(zoom), false);
				else
					setZoom(zoomCalculator.calcZoomOut(zoom), false);
			});
			
			// Process horizontal scroll bar dragging
			hRailNode.addEventListener('mousedown', processHScrollBarDragging);
			hRailNode.addEventListener('touchstart', processHScrollBarDragging);
			function processHScrollBarDragging(event) {
				var hRailW, hBarW, destSize, scrollBoxWidth, savedContentLeft, mouseDownX;
				var targetNode = event.target;

				ui.dragAndDrop({
					'event': event,
					'owner': this,
					'cursor': getComputedStyle(this)['cursor'],
					'startDragging': function(event) {
						hRailW = hRailNode.offsetWidth;
						hBarW = hBarNode.offsetWidth;
						destSize = Math.max(destWidth, destHeight);
						scrollBoxWidth = scrollBoxNode.offsetWidth;

						if (!targetNode.classList.contains('ra-photo-viewer-h-scroll-bar')) {
							var paddingX = padding + (destSize - destWidth) / 2;
							contentLeft = paddingX - (event.pageX - hBarW / 2 - hRailNode.getBoundingClientRect().left) / (hRailW - hBarW) * (destSize + padding2 - scrollBoxWidth);
							adjust();
						}

						savedContentLeft = contentLeft;
						mouseDownX = event.pageX;
					},
					'processDragging': function(event) {
						contentLeft = savedContentLeft - (event.pageX - mouseDownX) / (hRailW - hBarW) * (destSize - scrollBoxWidth);
						adjust();
					}
				});
			}
			
			// Process vertical scroll bar dragging
			vRailNode.addEventListener('mousedown', processVScrollBarDragging);
			vRailNode.addEventListener('touchstart', processVScrollBarDragging);
			function processVScrollBarDragging(event) {
				var vRailH, vBarH, destSize, scrollBoxHeight, savedContentTop, mouseDownY;
				var targetNode = event.target;

				ui.dragAndDrop({
					'event': event,
					'owner': this,
					'cursor': getComputedStyle(this)['cursor'],
					'startDragging': function(event) {
						vRailH = vRailNode.offsetHeight;
						vBarH = vBarNode.offsetHeight;
						destSize = Math.max(destWidth, destHeight);
						scrollBoxHeight = scrollBoxNode.offsetHeight;

						if (!targetNode.classList.contains('ra-photo-viewer-v-scroll-bar')) {
							var paddingY = padding + (destSize - destHeight) / 2;
							contentTop = paddingY - (event.pageY - vBarH / 2 - vRailNode.getBoundingClientRect().top) / (vRailH - vBarH) * (destSize + padding2 - scrollBoxHeight);
							adjust();
						}

						savedContentTop = contentTop;
						mouseDownY = event.pageY;
					},
					'processDragging': function(event) {
						contentTop = savedContentTop - (event.pageY - mouseDownY) / (vRailH - vBarH) * (destSize - scrollBoxHeight);
						adjust();
					}
				});
			}
			
			contentNode.addEventListener('mousedown', processContentDragging);
			contentNode.addEventListener('touchstart', processContentDragging);
			function processContentDragging(event) {
				event.preventDefault();
				var dX, dY, contentX, contentY;

				ui.dragAndDrop({
					'event': event,
					'owner': this,
					'cursor': 'default',
					'startDragging': function(event) {
						dX = event.pageX - contentLeft;
						dY = event.pageY - contentTop;
					},
					'processDragging': function(event) {
						contentLeft = event.pageX - dX;
						contentTop = event.pageY - dY;
						adjust();
					}
				});
			}
			
			initMultitouchZoom();
		}
		
		function setZoom(zoomValue, zoomCentered) {
			zoom = zoomValue;
			zoomFactor = zoom / 100;
			destWidth = srcBitmap.width * zoomFactor;
			destHeight = srcBitmap.height * zoomFactor;
			
			ui.photoViewerZoomPanel.visualizeZoom(zoom);
			adjust(zoomCentered);
		}
		
		function adjust(zoomCentered) {
			// Resizing image
			imageNode.style['transform'] = 'scale(' + zoomFactor + ')';
			contentNode.style['width'] = destWidth + 'px';
			contentNode.style['height'] = destHeight + 'px';
			
			// Obtain scroll box size
			var scrollBoxWidth = scrollBoxNode.offsetWidth;
			var scrollBoxHeight = scrollBoxNode.offsetHeight;
			
			// Calculating content position
			var hasOverflow = destWidth + padding2 > scrollBoxWidth || destHeight + padding2 > scrollBoxHeight;
			viewerNode.classList.toggle('ra-photo-viewer-with-scroll-bars', hasOverflow)
			
			// Calculating content position
			contentLeft = (contentLeft - zoomX) * destWidth / oldWidth + zoomX;
			contentTop = (contentTop - zoomY) * destHeight / oldHeight + zoomY;
			
			// Calculate limits
			var destSize = Math.max(destWidth, destHeight);
			var paddingX = padding + (destSize - destWidth) / 2;
			var paddingY = padding + (destSize - destHeight) / 2;

			// Add limits to horizontal position
			if (destSize + padding2 > scrollBoxWidth && !zoomCentered)
				contentLeft = ui.ensureRange(contentLeft, scrollBoxWidth + paddingX - destSize - 2 * padding, paddingX);
			else
				contentLeft = (scrollBoxWidth - destWidth) / 2;

			// Add limits to vertical position
			if (destSize + padding2 > scrollBoxHeight && !zoomCentered)
				contentTop = ui.ensureRange(contentTop, scrollBoxHeight + paddingY - destSize - 2 * padding, paddingY);
			else
				contentTop = (scrollBoxHeight - destHeight) / 2;
			
			// Set the content position
			contentNode.style['left'] = contentLeft + 'px';
			contentNode.style['top'] = contentTop + 'px';
			
			hBarNode.style['left'] = (100 * (-contentLeft + paddingX) / (destSize + padding2)) + '%';
			hBarNode.style['width'] = (100 * (scrollBoxWidth) / (destSize + padding2)) + '%';
			hRailVisible = (scrollBoxWidth / (destSize + padding2) < 1);
			if (hRailVisible)
				hRailNode.classList.remove('ra-hidden');
			else
				hRailNode.classList.add('ra-hidden');

			vBarNode.style['top'] = (100 * (-contentTop + paddingY) / (destSize + padding2)) + '%';
			vBarNode.style['height'] = (100 * scrollBoxHeight / (destSize + padding2)) + '%';
			vRailVisible = (scrollBoxHeight / (destSize + padding2) < 1);
			if (vRailVisible)
				vRailNode.classList.remove('ra-hidden');
			else
				vRailNode.classList.add('ra-hidden');
			
			oldWidth = destWidth;
			oldHeight = destHeight;
		}
		
		function zoomToFitImage() {
			setZoom(Math.min(
				(scrollBoxNode.offsetWidth - padding2) / srcBitmap.width * 100,
				(scrollBoxNode.offsetHeight - padding2) / srcBitmap.height * 100
			), true);
		}
		
		function initMultitouchZoom() {
			var p0 = {};
			var p1 = {};
			var zoomStarted = false;
			var touchStarted = false;

			scrollBoxNode.addEventListener('touchstart', function(event) {
				if (touchStarted) {
					event.preventDefault();
					event.stopPropagation();
				}

				var touches = event.touches;
				if (touches.length == 2 && !touchStarted) {
					event.preventDefault();
					event.stopPropagation();
					touchStarted = true;

					p0['x1'] = touches[0].pageX;
					p0['y1'] = touches[0].pageY;
					p0['x2'] = touches[1].pageX;
					p0['y2'] = touches[1].pageY;
					p0['zoom'] = zoom;
				}
			});

			scrollBoxNode.addEventListener('touchend', function(event) {
				if (touchStarted) {
					event.preventDefault();
					event.stopPropagation();
				}

				var touches = event.touches;
				if (touches.length <= 2 && touchStarted) {
					touchStarted = false;
					zoomStarted = false;
					p0 = {};
					p1 = {};
				}
			});

			scrollBoxNode.addEventListener('touchmove', function(event) {
				var touches = event.touches;
				if (touchStarted && touches.length == 2) {
					event.preventDefault();
					event.stopPropagation();
					p1['x1'] = touches[0].pageX;
					p1['y1'] = touches[0].pageY;
					p1['x2'] = touches[1].pageX;
					p1['y2'] = touches[1].pageY;

					applyTransform();
				}
			});
			
			function applyTransform() {
				var d0 = Math.hypot(p0['x2'] - p0['x1'], p0['y2'] - p0['y1']);
				var d1 = Math.hypot(p1['x2'] - p1['x1'], p1['y2'] - p1['y1']);
				
				var zoomValue = ui.ensureRange(p0['zoom'] * d1 / d0, minZoomValue, maxZoomValue);
				zoomX = (p0['x1'] + p0['x2']) / 2 - window.pageXOffset;
				zoomY = (p0['y1'] + p0['y2']) / 2 - window.pageYOffset;
				setZoom(zoomValue, false);
				zoomStarted = true;
			}
		}
		
		function zoomIn() {
			setZoom(zoomCalculator.calcZoomIn(zoom), true);		
		}
		
		function zoomOut() {
			setZoom(zoomCalculator.calcZoomOut(zoom), true);
		}
		
		plugin.init = init;
		plugin.adjust = adjust;
		plugin.setZoom = setZoom;
		plugin.zoomToFitImage = zoomToFitImage;
		plugin.zoomIn = zoomIn;
		plugin.zoomOut = zoomOut;
	})(ui.photoViewerScrollArea);
	//==================================================================================================================
	//  END OF: [Photo Viewer > Scroll Area]
	//==================================================================================================================
	
	//==================================================================================================================
	//  [Photo Viewer > Zoom Panel]
	//==================================================================================================================
	ui.photoViewerZoomPanel = {};
	(function(plugin) {
		var viewerNode;
		var zoomLabelNode;
		var zoomSliderNode;
		var zoomSliderValueNode;
		var zoomDropdownNode;
		
		function init(ownerNode) {
			viewerNode = ownerNode;
			zoomLabelNode = viewerNode.querySelector('.ra-photo-viewer-zoom-panel-percentage-label');
			zoomSliderNode = viewerNode.querySelector('.ra-photo-viewer-zoom-panel-slider');
			zoomSliderValueNode = viewerNode.querySelector('.ra-photo-viewer-zoom-panel-slider-wheel');
			zoomDropdownNode = viewerNode.querySelector('.ra-photo-viewer-zoom-panel-dropdown');
			
			// Processing click on the percentage label
			zoomLabelNode.addEventListener('click', function() {
				zoomDropdownNode.style['display'] = 'block';
				zoomLabelNode.classList.add('ui-expanded');
				ui.addPopup(zoomDropdownNode, [zoomLabelNode], closeZoomDropdown);
			});
			
			// Processing click on the percentage label
			zoomLabelNode.addEventListener('dblclick', function() {
				ui.closeAllPopups();
				ui.photoViewer.setZoom(100);
			});
			
			// Processing click on the zoom dropdown item
			ui.bindEvent(zoomDropdownNode, 'click', '.ra-photo-viewer-zoom-panel-dropdown-value', function() {
				var value = parseInt(this.getAttribute('data-tag'));
				ui.photoViewer.setZoom(value);
				closeZoomDropdown();
			});
			
			// Processing slider dragging
			zoomSliderNode.addEventListener('mousedown', zoomSliderDragging);
			zoomSliderNode.addEventListener('touchstart', zoomSliderDragging);
			function zoomSliderDragging(event) {
				var offsX, offsW;
				event.preventDefault();
				ui.closeAllPopups();

				ui.dragAndDrop({
					'event': event,
					'owner': this,
					'cursor': getComputedStyle(this)['cursor'],
					'startDragging': function(event) {
						offsX = zoomSliderNode.getBoundingClientRect().left;
						offsW = zoomSliderNode.offsetWidth;
						processDragging(event);
					},
					'processDragging': processDragging
				});

				function processDragging(event) {
					var value = zoomCalculator.zoom2exp(minZoomValue + (maxZoomValue - minZoomValue) * (event.pageX - offsX) / offsW);
					if (Math.abs(value - 100) < 8)
						value = 100;
					
					ui.photoViewer.setZoom(value);
				}
			}
		}
		
		function closeZoomDropdown() {
			zoomDropdownNode.style['display'] = 'none';
			zoomLabelNode.classList.remove('ui-expanded');
		}
		
		function visualizeZoom(zoom) {
			zoomLabelNode.innerText = Math.floor(zoom) + '%';
			zoomSliderValueNode.style['left'] = ((zoomCalculator.exp2zoom(zoom) -  minZoomValue) / (maxZoomValue - minZoomValue) * 100) + '%';
		}
		
		plugin.init = init;
		plugin.visualizeZoom = visualizeZoom;
	})(ui.photoViewerZoomPanel);
	//==================================================================================================================
	//  END OF: [Photo Viewer > Zoom Panel]
	//==================================================================================================================
	
	//==================================================================================================================
	//  [Photo Viewer > Keyboard Shortcuts]
	//==================================================================================================================
	ui.photoViewerKeyboardShortcuts = {};
	(function(plugin) {
		var viewerNode;
		var hookNode;
		
		function init(ownerNode) {
			viewerNode = ownerNode;
			hookNode = viewerNode.querySelector('.ra-photo-viewer-keyboard-hook');
			
			hookNode.addEventListener('keydown', function(event) {
				if (event.keyCode == 37) { // LEFT ARROW
					event.preventDefault();
					ui.photoViewer.switchToPreviousPhoto();
				}
				else if (event.keyCode == 39) { // RIGHT ARROW
					event.preventDefault();
					ui.photoViewer.switchToNextPhoto();
				}
				else if (event.keyCode == 187) { // '+'
					event.preventDefault();
					ui.photoViewer.zoomIn();
				}
				else if (event.keyCode == 189) { // '-'
					event.preventDefault();
					ui.photoViewer.zoomOut();
				}
				else if (event.keyCode == 27) { // ESCAPE
					event.preventDefault();
					ui.photoViewer.close();
				}
			});
		}
		
		function activate() {
			hookNode.focus();
		}
		
		function deactivate() {
			hookNode.blur();
		}
		
		plugin.init = init;
		plugin.activate = activate;
		plugin.deactivate = deactivate;
	})(ui.photoViewerKeyboardShortcuts);
	//==================================================================================================================
	//  END OF: [Photo Viewer > Keyboard Shortcuts]
	//==================================================================================================================
	
	//==================================================================================================================
	//  [Gallery]
	//==================================================================================================================
	function nextNodeBySelector(node, selector) {
		for (;;) {
			if (node.firstChild) {
				node = node.firstChild;
			}
			else if (node.nextSibling) {
				node = node.nextSibling;
			}
			else {
				for (;;) {
					node = node.parentNode;
					if (!node)
						return null;
					
					if (node.nextSibling) {
						node = node.nextSibling;
						break;
					}
				}
			}

			if (node.nodeType == 1 && node.matches(selector))
				return node;
		}
	}
	
	function prevNodeBySelector(node, selector) {
		for (;;) {
			if (node.lastChild) {
				node = node.lastChild;
			}
			else if (node.previousSibling) {
				node = node.previousSibling;
			}
			else {
				for (;;) {
					node = node.parentNode;
					if (!node)
						return null;
					
					if (node.previousSibling) {
						node = node.previousSibling;
						break;
					}
				}
			}

			if (node.nodeType == 1 && node.matches(selector))
				return node;
		}
	}
	
	ui.bindEvent(document, 'click', '.ra-gallery-photo', function(event) {
		event.preventDefault();	
		var photoNode = this;
		var imageURL = photoNode.querySelector('a').getAttribute('href');
		ui.photoViewer.display({
			'imageURL': imageURL,
			'onSwitchNext': function(callback) {
				photoNode = nextNodeBySelector(photoNode, '.ra-gallery-photo');
				imageURL = photoNode.querySelector('a').getAttribute('href');
				callback(imageURL);
			},
			'onSwitchPrevious': function(callback) {
				if (!photoNode.previousSibling)
					return;
				
				photoNode = prevNodeBySelector(photoNode, '.ra-gallery-photo');
				imageURL = photoNode.querySelector('a').getAttribute('href');
				callback(imageURL);
			},
			'onCanSwitchNext': function() {
				return nextNodeBySelector(photoNode, '.ra-gallery-photo');
			},
			'onCanSwitchPrevious': function() {
				return prevNodeBySelector(photoNode, '.ra-gallery-photo');
			}
		});
	});
	//==================================================================================================================
	//  END OF: [Gallery]
	//==================================================================================================================
})();