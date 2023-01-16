<!DOCTYPE html>
<html>

<?php
	//==================================================================================================================
	//  MIT License
	//  
	//  Copyright (c) 2023 Ryan O. Hicks and Alex Zhyrytovskyi
	//  
	//  Permission is hereby granted, free of charge, to any person obtaining a copy
	//  of this software and associated documentation files (the "Software"), to deal
	//  in the Software without restriction, including without limitation the rights
	//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	//  copies of the Software, and to permit persons to whom the Software is
	//  furnished to do so, subject to the following conditions:
	//  
	//  The above copyright notice and this permission notice shall be included in all
	//  copies or substantial portions of the Software.
	//  
	//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	//  SOFTWARE.
	//
	//==================================================================================================================
	
	function abs2rel($path) {
		return str_replace('\\', '/', substr(realpath($path), strlen(realpath($_SERVER['DOCUMENT_ROOT']))));
	}
	
	function displayPhotos() {
		$photos = array();
		
		// Collecting all photos
		$files = glob(__DIR__ . "/img/*.{png,jpg,jpeg}", GLOB_BRACE);
		foreach ($files as $file) {
			$photos []= array(
				'url' => abs2rel($file),
				'modified' => filemtime($file)
			);
		}
		
		// Sorting all the photos by their dates (from newer to older)
		usort($photos, function($a, $b) {
			return $b['modified'] - $a['modified'];
		});
		
		// Displaying photos
		foreach ($photos as $photo)
			echo '<div class="ra-gallery-photo"><a href="' . $photo['url'] . '"><img src="' . $photo['url'] . '" \/></a></div>';
	}
?>

<head>
	<meta charset="UTF-8"/>
	<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no"/>
	<meta http-equiv="X-UA-Compatible" content="IE=edge"/>

	<title>Gallery</title>
	
	<link href="./assets/style.css" rel="stylesheet"/>
	<script src="./assets/script.js"></script>
</head>

<body>
	<div class="ra-gallery">
		<?php displayPhotos(); ?>
	</div>
	
	<div class="ra-photo-viewer ra-stuff">
		<div class="ra-photo-viewer-keyboard-hook-container">
			<input class="ra-photo-viewer-keyboard-hook" type="text"/>
		</div>
		<div class="ra-photo-viewer-scroll-box">
			<div class="ra-photo-viewer-content">
				<div class="ra-photo-viewer-image">
					<canvas class="ra-photo-viewer-canvas"></canvas>
				</div>
			</div>
		</div>
		<div class="ra-photo-viewer-h-scroll-rail">
			<div class="ra-photo-viewer-h-scroll-bar"></div>
		</div>
		<div class="ra-photo-viewer-v-scroll-rail">
			<div class="ra-photo-viewer-v-scroll-bar"></div>
		</div>
		<div class="ra-photo-viewer-zoom-panel">
			<div class="ra-photo-viewer-zoom-panel-percentage-label">100%</div>
			<div class="ra-photo-viewer-zoom-panel-slider">
				<div class="ra-photo-viewer-zoom-panel-slider-rail"></div>
				<div class="ra-photo-viewer-zoom-panel-slider-wheel"></div>
			</div>
			<div class="ra-photo-viewer-zoom-panel-dropdown">
				<div class="ra-photo-viewer-zoom-panel-dropdown-value" data-tag="200">200%</div>
				<div class="ra-photo-viewer-zoom-panel-dropdown-value" data-tag="150">150%</div>
				<div class="ra-photo-viewer-zoom-panel-dropdown-value" data-tag="100">100%</div>
				<div class="ra-photo-viewer-zoom-panel-dropdown-value" data-tag="50">50%</div>
				<div class="ra-photo-viewer-zoom-panel-dropdown-value" data-tag="25">25%</div>
			</div>
		</div>
		<div class="ra-photo-viewer-prev-button">
			<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><rect fill="none" height="24" width="24"/><g><polygon points="17.77,3.77 16,2 6,12 16,22 17.77,20.23 9.54,12"/></g></svg>
		</div>
		<div class="ra-photo-viewer-next-button">
			<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><polygon points="6.23,20.23 8,22 18,12 8,2 6.23,3.77 14.46,12"/></g></svg>
		</div>
		<div class="ra-photo-viewer-close-button">
			<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
		</div>
	</div>
</body>

</html>