var obsStations = [];
var lat;
var lng;
var markers = [];
var grid;
var activeAlerts;
var current
var getRad;

mapboxgl.accessToken = 'pk.eyJ1IjoidGhlZGFkYXMxMzEzIiwiYSI6ImNrdXNrOXdwbTB3M2Uybm82d2V1bXljbjgifQ.Qk2kDT-hQODQFqGghcr4lQ';

const geocoder = new MapboxGeocoder({
	accessToken: mapboxgl.accessToken,
	types: 'country,region,place,postcode,locality,neighborhood'
	});
	geocoder.addTo('#geocoder');
 
geocoder.on('result', (e) => {let geo = e.result;
	lng = geo.geometry.coordinates[0];
	lat = geo.geometry.coordinates[1];
	markers.forEach((item) => {item.remove();});
	markers = [];
	obsStations = [];
	loadXMLDoc();
});

geocoder.on('clear', () => {
	getLocation();
	markers.forEach((item) => {item.remove();});
	markers = [];
	obsStations = []; 
});


function loadMap() {
	var element = document.getElementById('map');
	map = new mapboxgl.Map({
  		container: 'map',
  		style: 'mapbox://styles/mapbox/satellite-v9',
		//style: 'mapbox://styles/mapbox/dark-v10?optimize=true',
		center: [-98.35, 39.5],
  		zoom: 4,
	});
	getLocation();
}
function getLocation() {
  	if (navigator.geolocation) {
    		navigator.geolocation.getCurrentPosition(getUserPosition);
  	} else {
    		alert("Geolocation is not supported by this browser.");
  	}
}

function getUserPosition(position) {
	lat = position.coords.latitude;
	lng = position.coords.longitude;
	loadXMLDoc();
}

function clearMap() {
	 map.getStyle().layers.forEach((layer) => {
    		if (layer.id === "radar1" || layer.id === "radar-1") {
        		map.removeLayer(layer.id)
        		map.removeSource(layer.id);
    		}
	});
}

async function getRadar() {
	clearMap()
 	var response = await fetch('https://api.rainviewer.com/public/weather-maps.json')
	getRad = await response.json();
	console.log(getRad)
            	var i = 0;
		var f = 1;
            	const interval = setInterval(() => {
			let fr = f * - 1;
			map.getStyle().layers.forEach((layer) => {
    				if (layer.id === "radar" + fr) {
					setTimeout(()=> {
        					map.removeLayer(layer.id)
        					map.removeSource(layer.id);
					}, 250);
    				}
			});
			let nDate = new Date(getRad.radar.past[i].time * 1000).toString().split(" ");
			let nTime = nDate[4].split(":");
			if (nTime[0] > 12) {
				nTime[0] = nTime[0] - 12;}
			let disTime = nTime[0] + ":" + nTime[1];
			let footDate = nDate[0] + " " + nDate[1] + " " + nDate[2] + " " + nDate[3] + " " + disTime;
			document.getElementById("footer").innerHTML = footDate; //(new Date(getRad.radar.past[i].time * 1000)).toString();	
              		map.addLayer({
                		id: `radar` + f,
                		type: "raster",
				paint: {"raster-opacity" : 0.5},
                		source: {
                  			type: "raster",
                  			tiles: [
                    				getRad.host + getRad.radar.past[i].path + '/512/{z}/{x}/{y}/6/1_1.png'
                  			],
                  			tileSize: 512
                		},
                		layout: {visibility: "visible"},
                		minzoom: 0
              		});
			i++; 
			f = f * - 1;
			if (i === getRad.radar.past.length) {i = 0};
            	}, 750);
}

function reset() {
	clearInterval(interval);
	loadXMLDoc();
}

async function loadXMLDoc() {
  	var xhttp = new XMLHttpRequest();
  	xhttp.onreadystatechange = function() {
    	if (this.readyState == 4 && this.status == 200) {
		xmlParse(this);
    		}
  	};
  	xhttp.open("GET", "https://w1.weather.gov/xml/current_obs/index.xml", true);
  	xhttp.send();
	getForecast(lat,lng);
	showPosition(lat,lng);
	getRadar();
}

async function getForecast(lat,lng) {
	var response = await fetch('https://api.weather.gov/points/' + lat + ',' + lng + '');
	var grid = await response.json(); 
	forecastUrl = grid.properties.forecast;
	var response = await fetch(forecastUrl);
	var forecast = await response.json(); console.log(forecast);
	if (response.status === 500) {
		document.getElementById("svnDay").innerHTML = "There was an error with the forecast data." +
		" This page automatically updates every five minutes. If you would like your forecast sooner, please refresh your browser session."; 
		return;
	}
	let strForecast = loadForecast(forecast);
	document.getElementById("svnDay").innerHTML = strForecast;
}

async function showPosition(lat,lng) {
	var response = await fetch('https://api.weather.gov/alerts/active?point=' + lat + ',' + lng + '');
	alerts = await response.json(); console.log(alerts);
	var marker = new mapboxgl.Marker({
		color: "#18fc03"
	})
	marker.setLngLat([lng, lat]);
	marker.addTo(map);
	markers.push(marker);
	map.flyTo({
		center: [lng, lat],
		zoom: 8,
		essential: true
	});

	if (alerts.features.length > 0) {alertsPresent(marker, alerts);
	} else {document.getElementById("alertcontainer").style.display = "none";
	}	
}

async function xmlParse(xml) {	
  	var i;
  	var xmlDoc = xml.responseXML;
  	var x = xmlDoc.getElementsByTagName("station");
  	for (i = 0; i <x.length; i++) {
		let lat2 = x[i].getElementsByTagName("latitude")[0].childNodes[0].nodeValue;
		let lng2 = "" + x[i].getElementsByTagName("longitude")[0].childNodes[0].nodeValue + "";
		let dist = distance(lat, lat2, lng, lng2);
		let data = {name: x[i].getElementsByTagName("station_id")[0].childNodes[0].nodeValue, lat: lat2, lng: lng2, distance: dist};
		obsStations.push(data); 
	}
	obsStations.sort(function (a, b) {
		return a.distance - b.distance
	})
	url = 'https://api.weather.gov/stations/' + obsStations[0].name + '/observations/latest';
	var response = await fetch(url);
	current = await response.json(); console.log(current);
	addWeather(current);
	document.getElementById("station").innerHTML = obsStations[0].name;	
}

function addWeather(current) {
	document.getElementById("currIcon").innerHTML = "<img src='" + current.properties.icon + "' style='width: 95%; border-radius: 15%;' title='" + current.properties.textDescription + "'>";
	document.getElementById("currTemp").innerHTML = " " + Math.round((current.properties.temperature.value * 9/5) + 32) + "&#8457";
	document.getElementById("currHumid").innerHTML = " " + Math.round(current.properties.relativeHumidity.value) + "&#37";
	document.getElementById("currDew").innerHTML = "    " + Math.round((current.properties.dewpoint.value * 9/5) + 32) + "&#8457";
    	var val = Math.floor((current.properties.windDirection.value / 22.5) + 0.5);
    	var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
   	let windD = arr[(val % 16)];
	document.getElementById("currWind").innerHTML = " " + windD + " at " + Math.round(current.properties.windSpeed.value / 1.609) + " mph" ;
	let pressure = (current.properties.barometricPressure.value / 100) * .0295301;
	pressure = pressure.toFixed(2);
	document.getElementById("currPressure").innerHTML = " " + pressure + "in";
	if (current.properties.heatIndex.value !== null) {
		let realfeel = Math.round((current.properties.heatIndex.value * 9/5) + 32);
		document.getElementById("feelslike").innerHTML = "Feels Like:<span style='margin-left:5px;'>" + realfeel + "&#8457</span>"; 
		return;}
	else if (current.properties.windChill.value !== null) {
		let realfeel = Math.round((current.properties.windChill.value * 9/5) + 32);
		document.getElementById("feels").innerHTML = "Feels Like:<span style='margin-left: 5px;'>" + realfeel + "&#8457</span>"; 
		return;}
	else {	
		document.getElementById("feels").innerHTML = ""}
}

function loadForecast(forecast) {
	let str = "";
	for (i = 0; i <= 13; i++) {
		if(str === '') {
			str = "<div class='row' style='margin: 10px;'><hr>" + forecast.properties.periods[i].name + "</div>" + 
				"<div class='row'><div class='col'><img src='" + forecast.properties.periods[i].icon +"' style='width: 65%; border-radius: 10%;'></div>" +
				"<div class='col'>" + forecast.properties.periods[i].detailedForecast + "</div></div>";}
		else {
			str += "<div class='row' style='margin: 10px;'><hr>" + forecast.properties.periods[i].name + "</div>" + 
				"<div class='row'><div class='col'><img src='" + forecast.properties.periods[i].icon +"' style='width: 65%; border-radius: 10%;'></div>" +
				"<div class='col'>" + forecast.properties.periods[i].detailedForecast + "</div></div>";}
	};
	return str; 
}

function alertsPresent(marker, alerts){
	for (let i = 0; i < alerts.features.length; i++) {
		activeAlerts = alerts.features[i].properties.description;
	}
      	let markerElement = marker.getElement();
      	markerElement
		.querySelectorAll('svg g[fill="' + marker._color + '"]')[0]
		.setAttribute("fill", "#ff1a1a");      
      	marker._color = "#ff1a1a";
	var newA = activeAlerts.replace(/\n/g, " ");
	document.getElementById("alertcontainer").style.display = "block";
	document.getElementById("alertdiv").innerHTML = "<marquee behavior='scroll' direction='left' style='color: white; font-family: 'Times New Roman', Times, serif;'>" + newA + "</marquee>"
}


function distance(lat, lat2, lng, lng2) {
	lng = lng * Math.PI / 180;
	lng2 = lng2 * Math.PI / 180;
	lat = lat * Math.PI / 180;
	lat2 = lat2 * Math.PI / 180;
	let dlon = lng2 - lng;
	let dlat = lat2 - lat;
	let a = Math.pow(Math.sin(dlat / 2), 2)
		+ Math.cos(lat) * Math.cos(lat2)
		* Math.pow(Math.sin(dlon / 2),2);			
	let c = 2 * Math.asin(Math.sqrt(a));
	let r = 3956;
	return(c * r);
}

function changeMode() {
	if (document.getElementById("mode").innerText === "Dark Mode" ){
		map.setStyle('mapbox://styles/mapbox/dark-v10');
		getRadar();
		document.getElementById("mode").innerText = "Satellite Mode";}
	else {
		map.setStyle('mapbox://styles/mapbox/satellite-v9');
		getRadar();
		document.getElementById("mode").innerText = "Dark Mode";}
}

function openNav() {
	let curWidth = document.getElementById("curdetails").offsetWidth +10;
  	document.getElementById("mySidenav").style.width = curWidth + "px";
	document.getElementById("menu").style.width = "0";
}

function closeNav() {
  	document.getElementById("mySidenav").style.width = "0";
}

function openMenu() {
	let curWidth = document.getElementById("curdetails").offsetWidth +10;
  	document.getElementById("menu").style.width = curWidth + "px";
}

function closeMenu() {
  	document.getElementById("menu").style.width = "0";
}

function newLoc(event) {
		let loc = JSON.parse(JSON.stringify(event.lngLat));
		let xlat = loc.lat - lat; xlat = xlat.toFixed(4);
		let xlng = loc.lng - lng; xlng = xlng.toFixed(4);
		var msg = confirm("You are about to move to a new location. Are you sure you want to?")
		if (msg == true) {
		lat = loc.lat;
		lng = loc.lng;
		markers.forEach((item) => {item.remove();});
		markers = [];
		obsStations = [];
		loadXMLDoc();
	} else {
		return;
	}
}

window.onload = loadMap();
map.on('click', newLoc); 
setInterval(reset, 300000);
