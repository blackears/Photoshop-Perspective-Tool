/*
 * Perspective Grids
 * Version 1.2
 * Copyright (c) 2016, Mark McKay
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Mark McKay can be contacted at mark@kitfox.com.  This and other
 * projects can be found at http://www.kitfox.com
 */


function Point(x, y)
{
	this.x = x;
	this.y = y;

	this.copy = function()
	{
		return new Point(x, y);
	};

	this.length = function(){
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};

	this.normalize = function(){
		var magI = 1 / this.length();
		this.x *= magI;
		this.y *= magI;
	};

	this.scale = function(sx, sy){
		this.x *= sx;
		this.y *= sy;
	};

	this.translate = function(tx, ty){
		this.x += tx;
		this.y += ty;
	};

	this.rotate = function(angle){
		var sa = Math.sin(angle);
		var ca = Math.cos(angle);
		var xx = x * ca - y * sa;
		var yy = x * sa + y * ca;

		this.x = xx;
		this.y = yy;
	};
}

function addVertexCorner(lineArray, x, y)
{
	var p0Info = new PathPointInfo();
	lineArray.push(p0Info);
	p0Info.kind = PointKind.CORNERPOINT;
	p0Info.anchor = new Array(x, y);
	p0Info.leftDirection = p0Info.anchor;
	p0Info.rightDirection = p0Info.anchor;
}

function appendLine(lineWidth, p0, p1, lineSubPathArray)
{
	var lineArray = new Array();

	if (lineWidth <= 0)
	{
		addVertexCorner(lineArray, p0.x, p0.y);
		addVertexCorner(lineArray, p1.x, p1.y);
	}
	else
	{
		//Tangent
		var t = new Point(p0.y - p1.y, p1.x - p0.x);
		t.normalize();
		t.scale(lineWidth / 2, lineWidth / 2);

		addVertexCorner(lineArray, p0.x + t.x, p0.y + t.y);
		addVertexCorner(lineArray, p1.x + t.x, p1.y + t.y);
		addVertexCorner(lineArray, p1.x - t.x, p1.y - t.y);
		addVertexCorner(lineArray, p0.x - t.x, p0.y - t.y);
	}

	var pathInfo = new SubPathInfo();
	lineSubPathArray.push(pathInfo);
	pathInfo.operation = ShapeOperation.SHAPEADD;
	pathInfo.closed = false;
	pathInfo.entireSubPath = lineArray;
}

function addVertexSmooth(lineArray, kx0, ky0, x, y, kx1, ky1)
{
	var p0Info = new PathPointInfo();
	lineArray.push(p0Info);
	p0Info.kind = PointKind.SMOOTHPOINT;
	p0Info.anchor = new Array(x, y);
	p0Info.leftDirection = new Array(kx1, ky1);
	p0Info.rightDirection = new Array(kx0, ky0);
}

function appendCurve(lineWidth, p0, k0, k1, p1, lineSubPathArray)
{
	var lineArray = new Array();

	if (lineWidth <= 0)
	{
		addVertexSmooth(lineArray, p0.x, p0.y, p0.x, p0.y, k0.x, k0.y);
		addVertexSmooth(lineArray, k1.x, k1.y, p1.x, p1.y, p1.x, p1.y);
	}
	else
	{
		//Tangent
		var t0 = new Point(p0.y - k0.y, k0.x - p0.x);
		t0.normalize();
		t0.scale(lineWidth / 2, lineWidth / 2);

		var t1 = new Point(k1.y - p1.y, p1.x - k1.x);
		t1.normalize();
		t1.scale(lineWidth / 2, lineWidth / 2);

		addVertexSmooth(lineArray,
			p0.x + t0.x, p0.y + t0.y,
			p0.x + t0.x, p0.y + t0.y,
			k0.x + t0.x, k0.y + t0.y);
		addVertexSmooth(lineArray,
			k1.x + t1.x, k1.y + t1.y,
			p1.x + t1.x, p1.y + t1.y,
			p1.x + t1.x, p1.y + t1.y);

		addVertexSmooth(lineArray,
			p1.x - t1.x, p1.y - t1.y,
			p1.x - t1.x, p1.y - t1.y,
			k1.x - t1.x, k1.y - t1.y);
		addVertexSmooth(lineArray,
			k0.x - t0.x, k0.y - t0.y,
			p0.x - t0.x, p0.y - t0.y,
			p0.x - t0.x, p0.y - t0.y);

	}

	var pathInfo = new SubPathInfo();
	lineSubPathArray.push(pathInfo);
	pathInfo.operation = ShapeOperation.SHAPEADD;
	pathInfo.closed = false;
	pathInfo.entireSubPath = lineArray;
}

function canvasXform(p0, angle, tx, ty)
{
	p0.rotate(angle);
	p0.translate(tx, ty);

	return p0;
}

function createPathLayer(title, subPathArray)
{
	var docRef = app.activeDocument;

	var res = app.activeDocument.resolution;
	app.activeDocument.resizeImage(
		null,
		null,
		72,
		ResampleMethod.NONE);


//	var originalUnit = app.preferences.rulerUnits;

//	alert("Orig units " + originalUnit);

//	app.preferences.rulerUnits = Units.PIXELS;

	var myPathItem = docRef.pathItems.add(title, subPathArray);
//	alert("New units " + Units.PIXELS);

	app.activeDocument.resizeImage(
		null,
		null,
		res,
		ResampleMethod.NONE);

//	app.preferences.rulerUnits = originalUnit;
}

function createParallelLines(numLines, span, lineLength, angle, lineWidth)
{
	angle = angle * 2 * Math.PI / 360;

	var docRef = app.activeDocument;

	var imgWidth = docRef.width.value;
	var imgHeight = docRef.height.value;
	var tx = imgWidth / 2;
	var ty = imgHeight / 2;

	//Spacing for linear grid layout
	var offY = -span / 2;
	var spacing = span / (numLines - 1);
	if (numLines == 1)
	{
		offY = 0;
		spacing = 0;
	}
	else
	{
		offY = -span / 2;
		spacing = span / (numLines - 1);
	}

	var lineSubPathArray = new Array();

	for (var i = 0; i < numLines; ++i)
	{
		var y = offY + i * spacing;
		var x0 = -lineLength / 2;
		var x1 = lineLength / 2;

		var p0 = new Point(x0, y);
		var p1 = new Point(x1, y);

		appendLine(lineWidth, canvasXform(p0, angle, tx, ty),
			canvasXform(p1, angle, tx, ty),
			lineSubPathArray);
	}

	//create the path item, passing subpath to add method
	createPathLayer("Parallel Lines", lineSubPathArray);
}

function createDiminishingLines(numLines, span, ratio, lineLength, angle, mirror, lineWidth)
{
	angle = angle * 2 * Math.PI / 360;

	var docRef = app.activeDocument;

	var imgWidth = docRef.width.value;
	var imgHeight = docRef.height.value;
	var tx = imgWidth / 2;
	var ty = imgHeight / 2;

	var lineSubPathArray = new Array();

	var x0 = -lineLength / 2;
	var x1 = lineLength / 2;

	for (var i = 0; i < numLines; ++i)
	{
		var y = span * (1.0 * ratio / (ratio + i));

		var p0 = new Point(x0, y);
		var p1 = new Point(x1, y);

		appendLine(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
			canvasXform(p1.copy(), angle, tx, ty),
			lineSubPathArray);

		if (mirror)
		{
			p0 = new Point(x0, -y);
			p1 = new Point(x1, -y);

			appendLine(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
				canvasXform(p1.copy(), angle, tx, ty),
				lineSubPathArray);
		}
	}

	//Center line
	appendLine(lineWidth, canvasXform(new Point(x0, 0), angle, tx, ty),
		canvasXform(new Point(x1, 0), angle, tx, ty),
		lineSubPathArray);

	//create the path item, passing subpath to add method
	createPathLayer("Persp Parallel Lines", lineSubPathArray);
}

function createVanishingPoint(numSpokes, numRings, radius, angle, lineWidth)
{
	angle = angle * 2 * Math.PI / 360;

	var docRef = app.activeDocument;

	var imgWidth = docRef.width.value;
	var imgHeight = docRef.height.value;
	var tx = imgWidth / 2;
	var ty = imgHeight / 2;

	var lineSubPathArray = new Array();

	var tota3Spokes = numSpokes * Math.pow(2, numRings);
	var outerRadius = radius * numRings;

	var dSpokeAngle = Math.PI * 2 / numSpokes;
	for (var spoke = 0; spoke < numSpokes; ++spoke)
	{
		var spokeAngle = spoke * dSpokeAngle;

		var p0 = new Point(0, 0);
		var p1 = new Point(outerRadius* Math.cos(spokeAngle),
			outerRadius * -Math.sin(spokeAngle));

		appendLine(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
			canvasXform(p1.copy(), angle, tx, ty),
			lineSubPathArray);

		//Ticks in extra rings
		for (var j = 1; j < numRings; ++j)
		{
			var numTicks = Math.pow(2, j - 1);
			for (var k = 0; k < numTicks; ++k)
			{
				var tickAngle = spokeAngle
					+ dSpokeAngle * (k * 2 + 1) / (numTicks * 2);
				var innerRadius = radius * (j);

				p0 = new Point(innerRadius * Math.cos(tickAngle),
					innerRadius * -Math.sin(tickAngle));
				p1 = new Point(outerRadius * Math.cos(tickAngle),
					outerRadius * -Math.sin(tickAngle));

				appendLine(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
					canvasXform(p1.copy(), angle, tx, ty),
					lineSubPathArray);
			}
		}
	}

	//create the path item, passing subpath to add method
	createPathLayer("Vanishing Point", lineSubPathArray);
}

function createEllipses(numLines, length, height, angle, lineWidth)
{
	angle = angle * 2 * Math.PI / 360;
	var docRef = app.activeDocument;

	var imgWidth = docRef.width.value;
	var imgHeight = docRef.height.value;
	var tx = imgWidth / 2;
	var ty = imgHeight / 2;

	var lineSubPathArray = new Array();

	var x0 = -length / 2;
	var x1 = length / 2;

	var p0 = new Point(x0, 0);
	var p2 = new Point(x1, 0);
	var dHeight = height / numLines;
	for (var i = 0; i < numLines; ++i)
	{
		var y = dHeight * (i + 1);
		var kHeight = y * 0.551784;
		var kWidth = (length / 2) * 0.551784;

		var p1 = new Point(0, y);
		var k00 = new Point(x0, kHeight);
		var k01 = new Point(-kWidth, y);
		var k10 = new Point(kWidth, y);
		var k11 = new Point(x1, kHeight);

		appendCurve(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
			canvasXform(k00.copy(), angle, tx, ty),
			canvasXform(k01.copy(), angle, tx, ty),
			canvasXform(p1.copy(), angle, tx, ty),
			lineSubPathArray);

		appendCurve(lineWidth, canvasXform(p1.copy(), angle, tx, ty),
			canvasXform(k10.copy(), angle, tx, ty),
			canvasXform(k11.copy(), angle, tx, ty),
			canvasXform(p2.copy(), angle, tx, ty),
			lineSubPathArray);

		p1 = new Point(0, -y);
		k00 = new Point(x0, -kHeight);
		k01 = new Point(-kWidth, -y);
		k10 = new Point(kWidth, -y);
		k11 = new Point(x1, -kHeight);

		appendCurve(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
			canvasXform(k00.copy(), angle, tx, ty),
			canvasXform(k01.copy(), angle, tx, ty),
			canvasXform(p1.copy(), angle, tx, ty),
			lineSubPathArray);

		appendCurve(lineWidth, canvasXform(p1.copy(), angle, tx, ty),
			canvasXform(k10.copy(), angle, tx, ty),
			canvasXform(k11.copy(), angle, tx, ty),
			canvasXform(p2.copy(), angle, tx, ty),
			lineSubPathArray);

	}

	//Center line
	appendLine(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
		canvasXform(p2.copy(), angle, tx, ty),
		lineSubPathArray);

	//create the path item, passing subpath to add method
	createPathLayer("Ellipses", lineSubPathArray);
}

function createParabolas(numLines, radius, angle, lineWidth)
{
	angle = angle * 2 * Math.PI / 360;
	var docRef = app.activeDocument;

	var imgWidth = docRef.width.value;
	var imgHeight = docRef.height.value;
	var tx = imgWidth / 2;
	var ty = imgHeight / 2;

	var lineSubPathArray = new Array();

	var x0 = -radius;
	var x1 = radius;

	var p1 = new Point(0, 0);
	var dLineAngle = Math.PI / (2 * (numLines + 1));
	for (var i = 1; i <= numLines; ++i)
	{
		var lineAngle = dLineAngle * i;
		var p0 = new Point(-Math.cos(lineAngle) * radius, Math.sin(lineAngle) * radius);

		var slope = 2 * (p0.y / p0.x);
		//Tangent of parabola passing through p0 will be a line that
		// also passes through (p0.x / 2, 0).  This would be the control point
		// of a quadradic bezier
		var k0 = new Point(p0.x / 2, 0);

		var k00 = new Point((p0.x + k0.x) / 2, (p0.y + k0.y) / 2);
		var k01 = new Point((p1.x + k0.x) / 2, (p1.y + k0.y) / 2);

		//For opposite side, reflect across y axis

		var p2 = new Point(-p0.x, p0.y);

		var k10 = new Point(-k01.x, k01.y);
		var k11 = new Point(-k00.x, k00.y);

		appendCurve(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
			canvasXform(k00.copy(), angle, tx, ty),
			canvasXform(k01.copy(), angle, tx, ty),
			canvasXform(p1.copy(), angle, tx, ty),
			lineSubPathArray);

		appendCurve(lineWidth, canvasXform(p1.copy(), angle, tx, ty),
			canvasXform(k10.copy(), angle, tx, ty),
			canvasXform(k11.copy(), angle, tx, ty),
			canvasXform(p2.copy(), angle, tx, ty),
			lineSubPathArray);

		p0 = new Point(p0.x, -p0.y);
		p2 = new Point(p2.x, -p2.y);
		k00 = new Point(k00.x, -k00.y);
		k01 = new Point(k01.x, -k01.y);
		k10 = new Point(k10.x, -k10.y);
		k11 = new Point(k11.x, -k11.y);

		appendCurve(lineWidth, canvasXform(p0.copy(), angle, tx, ty),
			canvasXform(k00.copy(), angle, tx, ty),
			canvasXform(k01.copy(), angle, tx, ty),
			canvasXform(p1.copy(), angle, tx, ty),
			lineSubPathArray);

		appendCurve(lineWidth, canvasXform(p1.copy(), angle, tx, ty),
			canvasXform(k10.copy(), angle, tx, ty),
			canvasXform(k11.copy(), angle, tx, ty),
			canvasXform(p2.copy(), angle, tx, ty),
			lineSubPathArray);

	}

	//Center line
	appendLine(lineWidth, canvasXform(new Point(-radius, 0), angle, tx, ty),
		canvasXform(new Point(radius, 0), angle, tx, ty),
		lineSubPathArray);

	//create the path item, passing subpath to add method
	createPathLayer("Parabolas", lineSubPathArray);
}

function buildTabParallelLines(tab)
{
	var grpNumLines = tab.add("group");
	grpNumLines.add("statictext", undefined, 'Num Lines');
	var textNumLines = grpNumLines.add("edittext", undefined, '10');
	textNumLines.preferredSize = [80, 20];

	var grpSpan = tab.add("group");
	grpSpan.add("statictext", undefined, 'Span');
	var textSpan = grpSpan.add("edittext", undefined, '300');
	textSpan.preferredSize = [80, 20];

	var grpLineLength = tab.add("group");
	grpLineLength.add("statictext", undefined, 'Line Length');
	var textLineLength = grpLineLength.add("edittext", undefined, '500');
	textLineLength.preferredSize = [80, 20];

	var grpAngle = tab.add("group");
	grpAngle.add("statictext", undefined, 'Angle');
	var textAngle = grpAngle.add("edittext", undefined, '0');
	textAngle.preferredSize = [80, 20];

	var grpLineWidth = tab.add("group");
	grpLineWidth.add("statictext", undefined, 'Line Width');
	var textLineWidth = grpLineWidth.add("edittext", undefined, '0');
	textLineWidth.preferredSize = [80, 20];

	tab.bnOk = tab.add('button', undefined, 'Ok');
	tab.bnOk.onClick = function() {
		createParallelLines(
			parseInt(textNumLines.text),
			parseFloat(textSpan.text),
			parseFloat(textLineLength.text),
			parseFloat(textAngle.text),
			parseFloat(textLineWidth.text)
			);
//		tab.window.close();
	};
}

function buildTabDiminishingLines(tab)
{
	var grpNumLines = tab.add("group");
	grpNumLines.add("statictext", undefined, 'Num Lines');
	var textNumLines = grpNumLines.add("edittext", undefined, '10');
	textNumLines.preferredSize = [80, 20];

	var grpSpan = tab.add("group");
	grpSpan.add("statictext", undefined, 'Span');
	var textSpan = grpSpan.add("edittext", undefined, '200');
	textSpan.preferredSize = [80, 20];

	var grpRatio = tab.add("group");
	grpRatio.add("statictext", undefined, 'Zoom');
	var textRatio = grpRatio.add("edittext", undefined, '1');
	textRatio.preferredSize = [80, 20];

	var grpLineLength = tab.add("group");
	grpLineLength.add("statictext", undefined, 'Line Length');
	var textLineLength = grpLineLength.add("edittext", undefined, '500');
	textLineLength.preferredSize = [80, 20];

	var grpAngle = tab.add("group");
	grpAngle.add("statictext", undefined, 'Angle');
	var textAngle = grpAngle.add("edittext", undefined, '0');
	textAngle.preferredSize = [80, 20];

	var grpLineWidth = tab.add("group");
	grpLineWidth.add("statictext", undefined, 'Line Width');
	var textLineWidth = grpLineWidth.add("edittext", undefined, '0');
	textLineWidth.preferredSize = [80, 20];

	var chkMirror = tab.add("checkbox", undefined, 'Mirror');

	tab.bnOk = tab.add('button', undefined, 'Ok');
	tab.bnOk.onClick = function() {
		createDiminishingLines(
			parseInt(textNumLines.text),
			parseFloat(textSpan.text),
			parseFloat(textRatio.text),
			parseFloat(textLineLength.text),
			parseFloat(textAngle.text),
			chkMirror.value,
			parseFloat(textLineWidth.text)
			);
//		tab.window.close();
	};
}

function buildTabVanishingPoint(tab)
{
	var grpNumLines = tab.add("group");
	grpNumLines.add("statictext", undefined, 'Num Spokes');
	var textNumLines = grpNumLines.add("edittext", undefined, '120');
	textNumLines.preferredSize = [80, 20];

	var grpSpan = tab.add("group");
	grpSpan.add("statictext", undefined, 'Num Rings');
	var textSpan = grpSpan.add("edittext", undefined, '3');
	textSpan.preferredSize = [80, 20];

	var grpLineLength = tab.add("group");
	grpLineLength.add("statictext", undefined, 'Inner Radius');
	var textLineLength = grpLineLength.add("edittext", undefined, '200');
	textLineLength.preferredSize = [80, 20];

	var grpAngle = tab.add("group");
	grpAngle.add("statictext", undefined, 'Angle');
	var textAngle = grpAngle.add("edittext", undefined, '0');
	textAngle.preferredSize = [80, 20];

	var grpLineWidth = tab.add("group");
	grpLineWidth.add("statictext", undefined, 'Line Width');
	var textLineWidth = grpLineWidth.add("edittext", undefined, '0');
	textLineWidth.preferredSize = [80, 20];

	tab.bnOk = tab.add('button', undefined, 'Ok');
	tab.bnOk.onClick = function() {
		createVanishingPoint(
			parseInt(textNumLines.text),
			parseInt(textSpan.text),
			parseFloat(textLineLength.text),
			parseFloat(textAngle.text),
			parseFloat(textLineWidth.text)
			);
//		tab.window.close();
	};
}

function buildTabEllipses(tab)
{
	var grpNumLines = tab.add("group");
	grpNumLines.add("statictext", undefined, 'Num Lines');
	var textNumLines = grpNumLines.add("edittext", undefined, '20');
	textNumLines.preferredSize = [80, 20];

	var grpLength = tab.add("group");
	grpLength.add("statictext", undefined, 'Length');
	var textLength = grpLength.add("edittext", undefined, '600');
	textLength.preferredSize = [80, 20];

	var grpHeight = tab.add("group");
	grpHeight.add("statictext", undefined, 'Height');
	var textHeight = grpHeight.add("edittext", undefined, '300');
	textHeight.preferredSize = [80, 20];

	var grpAngle = tab.add("group");
	grpAngle.add("statictext", undefined, 'Angle');
	var textAngle = grpAngle.add("edittext", undefined, '0');
	textAngle.preferredSize = [80, 20];

	var grpLineWidth = tab.add("group");
	grpLineWidth.add("statictext", undefined, 'Line Width');
	var textLineWidth = grpLineWidth.add("edittext", undefined, '0');
	textLineWidth.preferredSize = [80, 20];

	tab.bnOk = tab.add('button', undefined, 'Ok');
	tab.bnOk.onClick = function() {
		createEllipses(
			parseInt(textNumLines.text),
			parseInt(textLength.text),
			parseFloat(textHeight.text),
			parseFloat(textAngle.text),
			parseFloat(textLineWidth.text)
			);
//		tab.window.close();
	};
}

function buildTabParabolas(tab)
{
	var grpNumLines = tab.add("group");
	grpNumLines.add("statictext", undefined, 'Num Lines');
	var textNumLines = grpNumLines.add("edittext", undefined, '16');
	textNumLines.preferredSize = [80, 20];

	var grpRadius = tab.add("group");
	grpRadius.add("statictext", undefined, 'Radius');
	var textRadius = grpRadius.add("edittext", undefined, '300');
	textRadius.preferredSize = [80, 20];

	var grpAngle = tab.add("group");
	grpAngle.add("statictext", undefined, 'Angle');
	var textAngle = grpAngle.add("edittext", undefined, '0');
	textAngle.preferredSize = [80, 20];

	var grpLineWidth = tab.add("group");
	grpLineWidth.add("statictext", undefined, 'Line Width');
	var textLineWidth = grpLineWidth.add("edittext", undefined, '0');
	textLineWidth.preferredSize = [80, 20];

	tab.bnOk = tab.add('button', undefined, 'Ok');
	tab.bnOk.onClick = function() {
		createParabolas(
			parseInt(textNumLines.text),
			parseInt(textRadius.text),
			parseFloat(textAngle.text),
			parseFloat(textLineWidth.text)
			);
//		tab.window.close();
	};
}

function buildTabAbout(tab)
{
	tab.add("statictext", undefined, 'Perspective grids');
	tab.add("statictext", undefined, 'Copyright (c) 2013, Mark McKay');
	tab.add("statictext", undefined, 'mark@kitfox.com');
	tab.add("statictext", undefined, 'www.kitfox.com');
	tab.bnClose = tab.add("button", undefined, 'Close');
	tab.bnClose.onClick = function() {
		tab.window.close();
	};
}

function buildWindow()
{
	var w = new Window("dialog", "Title");

	w.tp = w.add("tabbedpanel");
	w.tp.size = {width:500, height:300};

	w.tp.t3 = w.tp.add("tab" ,undefined, 'Vanishing Point');
	w.tp.t3.alignChildren = "left";
	buildTabVanishingPoint(w.tp.t3);

	w.tp.t2 = w.tp.add("tab" ,undefined, 'Persp Parallel Lines');
	w.tp.t2.alignChildren = "left";
	buildTabDiminishingLines(w.tp.t2);

	w.tp.t1 = w.tp.add("tab", undefined, 'Parallel Lines');
	w.tp.t1.alignChildren="left";
	buildTabParallelLines(w.tp.t1);

	w.tp.t4 = w.tp.add("tab" ,undefined, 'Ellipses');
	w.tp.t4.alignChildren = "left";
	buildTabEllipses(w.tp.t4);

	w.tp.t5 = w.tp.add("tab" ,undefined, 'Parabolas');
	w.tp.t5.alignChildren = "left";
	buildTabParabolas(w.tp.t5);

	w.tp.t6 = w.tp.add("tab" ,undefined, 'About');
	w.tp.t6.alignChildren = "left";
	buildTabAbout(w.tp.t6, w);

	return w;
}


var w = buildWindow();


w.show();
